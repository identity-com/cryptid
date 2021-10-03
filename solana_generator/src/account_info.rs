use crate::{
    AccountArgument, AccountInfoIterator, AllAny, FromAccounts, GeneratorResult,
    MultiIndexableAccountArgument, SingleIndexableAccountArgument, SystemProgram,
};
use solana_program::account_info::AccountInfo as SolanaAccountInfo;
use solana_program::clock::Epoch;
use solana_program::entrypoint::MAX_PERMITTED_DATA_INCREASE;
use solana_program::program_error::ProgramError;
use solana_program::pubkey::Pubkey;
use std::cell::RefCell;
use std::mem::{align_of, size_of, transmute};
use std::ops::Deref;
use std::rc::Rc;
use std::slice::{from_raw_parts, from_raw_parts_mut};

/// A custom version of [`solana_program::account_info::AccountInfo`] that allows for owner changes.
#[derive(Debug, Clone)]
pub struct AccountInfo {
    /// The public key of the account.
    pub key: Pubkey,
    /// Whether the account is a signer of the transaction
    pub is_signer: bool,
    /// Whether the account is writable
    pub is_writable: bool,
    /// How many lamports the account has.
    ///
    /// # Change Limitations
    /// - Lamports must not have been created or destroyed by transaction's end
    /// - Lamports may only be subtracted from accounts owned by the subtracting program
    pub lamports: Rc<RefCell<&'static mut u64>>,
    /// The data the account stores. Public information, can be read by anyone on the network.
    ///
    /// # Change Limitations
    /// - Data size may only be changed by the system program
    /// - Data size cannot be changed once set except by account wipe if no rent
    /// - Data can only be changed by the owning program
    /// - Data will be wiped if there is no rent
    pub data: Rc<RefCell<&'static mut [u8]>>,
    /// The owning program of the account, defaults to the system program for new accounts
    ///
    /// # Change Limitations
    /// - Owner can only be changed by the owning program
    /// - All data must be zeroed to be transferred
    pub owner: Rc<RefCell<&'static mut Pubkey>>,
    /// Whether or not the account is executable
    pub executable: bool,
    /// The next epoch this account owes rent. Can be rent free by giving two years of rent.
    pub rent_epoch: Epoch,
}
impl AccountInfo {
    unsafe fn read_value<T: Copy>(input: *mut u8, offset: &mut usize) -> T {
        let out = (input.add(*offset) as *const T).read_unaligned();
        *offset += size_of::<T>();
        out
    }

    pub(crate) unsafe fn deserialize(input: *mut u8) -> (Pubkey, Vec<Self>, &'static [u8]) {
        let mut offset = 0;

        let num_accounts = Self::read_value::<u64>(input, &mut offset) as usize;
        let mut accounts = Vec::with_capacity(num_accounts);
        for _ in 0..num_accounts {
            let dup_info = Self::read_value::<u8>(input, &mut offset);
            if dup_info == u8::MAX {
                let is_signer = Self::read_value::<u8>(input, &mut offset) != 0;
                let is_writable = Self::read_value::<u8>(input, &mut offset) != 0;
                let executable = Self::read_value::<u8>(input, &mut offset) != 0;
                offset += size_of::<u32>(); //padding to u64
                let key = Self::read_value(input, &mut offset);
                let owner = Rc::new(RefCell::new(&mut *(input.add(offset) as *mut _)));
                offset += size_of::<Pubkey>();
                let lamports = Rc::new(RefCell::new(&mut *(input.add(offset) as *mut _)));
                offset += size_of::<u64>();
                let data_len = Self::read_value::<u64>(input, &mut offset) as usize;
                let data = Rc::new(RefCell::new(from_raw_parts_mut(
                    input.add(offset),
                    data_len,
                )));
                offset += data_len + MAX_PERMITTED_DATA_INCREASE;
                offset += (offset as *const u8).align_offset(align_of::<u128>());

                let rent_epoch = Self::read_value(input, &mut offset);

                accounts.push(Self {
                    key,
                    is_signer,
                    is_writable,
                    lamports,
                    data,
                    owner,
                    executable,
                    rent_epoch,
                });
            } else {
                offset += 7;

                accounts.push(accounts[dup_info as usize].clone());
            }
        }

        let instruction_data_len = Self::read_value::<u64>(input, &mut offset) as usize;
        let instruction_data = from_raw_parts(input.add(offset), instruction_data_len);
        offset += instruction_data_len;

        let program_id = Self::read_value(input, &mut offset);
        (program_id, accounts, instruction_data)
    }

    /// Turns this into a normal [`solana_program::account_info::AccountInfo`] for usage with standard functions.
    ///
    /// # Safety
    /// The resulting account info has owner as a shared reference that can be modified.
    /// Only use this when the resulting account info will never be used after another use of self.
    pub unsafe fn to_solana_account_info<'a>(&'a self) -> SolanaAccountInfo<'a> {
        SolanaAccountInfo {
            key: &self.key,
            is_signer: self.is_signer,
            is_writable: self.is_writable,
            lamports: transmute::<Rc<RefCell<&'static mut u64>>, Rc<RefCell<&'a mut u64>>>(
                self.lamports.clone(),
            ),
            data: transmute::<Rc<RefCell<&'static mut [u8]>>, Rc<RefCell<&'a mut [u8]>>>(
                self.data.clone(),
            ),
            owner: &*(self.owner.borrow().deref().deref() as *const solana_program::pubkey::Pubkey),
            executable: self.executable,
            rent_epoch: self.rent_epoch,
        }
    }
}
impl AccountArgument for AccountInfo {
    fn write_back(
        self,
        _program_id: Pubkey,
        _system_program: Option<&SystemProgram>,
    ) -> GeneratorResult<()> {
        Ok(())
    }

    fn add_keys(&self, mut add: impl FnMut(Pubkey) -> GeneratorResult<()>) -> GeneratorResult<()> {
        add(self.key)
    }
}
impl FromAccounts<()> for AccountInfo {
    fn from_accounts(
        _program_id: Pubkey,
        infos: &mut impl AccountInfoIterator<Item = AccountInfo>,
        _arg: (),
    ) -> GeneratorResult<Self> {
        match infos.next() {
            None => Err(ProgramError::NotEnoughAccountKeys.into()),
            Some(info) => Ok(info),
        }
    }
}
impl MultiIndexableAccountArgument<()> for AccountInfo {
    fn is_signer(&self, _indexer: ()) -> GeneratorResult<bool> {
        Ok(self.is_signer)
    }

    fn is_writable(&self, _indexer: ()) -> GeneratorResult<bool> {
        Ok(self.is_writable)
    }

    fn is_owner(&self, owner: Pubkey, _indexer: ()) -> GeneratorResult<bool> {
        Ok(**self.owner.borrow() == owner)
    }
}
impl MultiIndexableAccountArgument<AllAny> for AccountInfo {
    fn is_signer(&self, indexer: AllAny) -> GeneratorResult<bool> {
        Ok(indexer.is_not() ^ self.is_signer(())?)
    }

    fn is_writable(&self, indexer: AllAny) -> GeneratorResult<bool> {
        Ok(indexer.is_not() ^ self.is_writable(())?)
    }

    fn is_owner(&self, owner: Pubkey, indexer: AllAny) -> GeneratorResult<bool> {
        Ok(indexer.is_not() ^ self.is_owner(owner, ())?)
    }
}
impl SingleIndexableAccountArgument<()> for AccountInfo {
    fn owner(&self, _indexer: ()) -> GeneratorResult<Pubkey> {
        Ok(**self.owner.borrow())
    }

    fn key(&self, _indexer: ()) -> GeneratorResult<Pubkey> {
        Ok(self.key)
    }
}

#[cfg(test)]
pub mod account_info_test {
    use crate::{
        AccountInfo, All, Any, MultiIndexableAccountArgument, NotAll, NotAny, Pubkey,
        SingleIndexableAccountArgument,
    };
    use rand::{thread_rng, Rng};
    use solana_program::entrypoint::MAX_PERMITTED_DATA_INCREASE;
    use std::cell::RefCell;
    use std::mem::align_of;
    use std::rc::Rc;
    fn add<const N: usize>(data: &mut Vec<u8>, add: [u8; N]) {
        for item in add {
            data.push(item);
        }
    }
    fn pad(data: &mut Vec<u8>, add: usize) {
        for _ in 0..add {
            data.push(0);
        }
    }

    #[allow(clippy::too_many_arguments)]
    fn add_account<const N: usize>(
        data: &mut Vec<u8>,
        is_signer: bool,
        is_writable: bool,
        is_executable: bool,
        key: Pubkey,
        owner: Pubkey,
        lamports: u64,
        account_data: [u8; N],
        rent_epoch: u64,
    ) {
        data.push(u8::MAX);
        data.push(is_signer as u8);
        data.push(is_writable as u8);
        data.push(is_executable as u8);
        add(data, 0u32.to_ne_bytes());
        add(data, key.to_bytes());
        add(data, owner.to_bytes());
        add(data, lamports.to_ne_bytes());
        add(data, (N as u64).to_ne_bytes());
        add(data, account_data);
        add(data, [0; MAX_PERMITTED_DATA_INCREASE]);
        let extra = (data.len() as *const u8).align_offset(align_of::<u128>());
        pad(data, extra);
        add(data, rent_epoch.to_ne_bytes());
    }

    #[test]
    fn deserialization_test() {
        let key1 = Pubkey::new_unique();
        let owner1 = Pubkey::new_unique();
        let key2 = Pubkey::new_unique();
        let owner2 = Pubkey::new_unique();
        let program_id = Pubkey::new_unique();

        let mut data = Vec::new();
        add(&mut data, 3u64.to_ne_bytes());
        add_account(
            &mut data, true, true, false, key1, owner1, 100, [32; 10], 1828,
        );
        add_account(
            &mut data, false, false, true, key2, owner2, 100000, [56; 1000], 567,
        );
        data.push(0);
        add(&mut data, [9; 7]);
        add(&mut data, 50u64.to_ne_bytes());
        add(&mut data, [224; 50]);
        add(&mut data, program_id.to_bytes());

        let (solana_program_id, solana_accounts, solana_instruction_data) =
            unsafe { crate::solana_program::entrypoint::deserialize(data.as_mut_ptr()) };
        assert_eq!(solana_program_id, &program_id);
        assert_eq!(solana_accounts.len(), 3);
        assert!(solana_accounts[0].is_signer);
        assert!(solana_accounts[0].is_writable);
        assert!(!solana_accounts[0].executable);
        assert_eq!(solana_accounts[0].key, &key1);
        assert_eq!(solana_accounts[0].owner, &owner1);
        assert_eq!(**solana_accounts[0].lamports.borrow(), 100);
        assert_eq!(solana_accounts[0].data.borrow().len(), 10);
        assert!(solana_accounts[0]
            .data
            .borrow()
            .iter()
            .all(|data| *data == 32));
        assert_eq!(solana_accounts[0].rent_epoch, 1828);
        assert!(!solana_accounts[1].is_signer);
        assert!(!solana_accounts[1].is_writable);
        assert!(solana_accounts[1].executable);
        assert_eq!(solana_accounts[1].key, &key2);
        assert_eq!(solana_accounts[1].owner, &owner2);
        assert_eq!(**solana_accounts[1].lamports.borrow(), 100000);
        assert_eq!(solana_accounts[1].data.borrow().len(), 1000);
        assert!(solana_accounts[1]
            .data
            .borrow()
            .iter()
            .all(|data| *data == 56));
        assert_eq!(solana_accounts[1].rent_epoch, 567);
        assert!(solana_accounts[2].is_signer);
        assert!(solana_accounts[2].is_writable);
        assert!(!solana_accounts[2].executable);
        assert_eq!(solana_accounts[2].key, &key1);
        assert_eq!(solana_accounts[2].owner, &owner1);
        assert_eq!(**solana_accounts[2].lamports.borrow(), 100);
        assert_eq!(solana_accounts[2].data.borrow().len(), 10);
        assert!(solana_accounts[2]
            .data
            .borrow()
            .iter()
            .all(|data| *data == 32));
        assert_eq!(solana_accounts[2].rent_epoch, 1828);
        assert_eq!(solana_instruction_data.len(), 50);
        assert!(solana_instruction_data.iter().all(|data| *data == 224));

        let (generator_program_id, generator_accounts, generator_instruction_data) =
            unsafe { crate::AccountInfo::deserialize(data.as_mut_ptr()) };
        assert_eq!(generator_program_id, program_id);
        assert_eq!(generator_accounts.len(), 3);
        assert!(generator_accounts[0].is_signer);
        assert!(generator_accounts[0].is_writable);
        assert!(!generator_accounts[0].executable);
        assert_eq!(generator_accounts[0].key, key1);
        assert_eq!(**generator_accounts[0].owner.borrow(), owner1);
        assert_eq!(**generator_accounts[0].lamports.borrow(), 100);
        assert_eq!(generator_accounts[0].data.borrow().len(), 10);
        assert!(generator_accounts[0]
            .data
            .borrow()
            .iter()
            .all(|data| *data == 32));
        assert_eq!(generator_accounts[0].rent_epoch, 1828);
        assert!(!generator_accounts[1].is_signer);
        assert!(!generator_accounts[1].is_writable);
        assert!(generator_accounts[1].executable);
        assert_eq!(generator_accounts[1].key, key2);
        assert_eq!(**generator_accounts[1].owner.borrow(), owner2);
        assert_eq!(**generator_accounts[1].lamports.borrow(), 100000);
        assert_eq!(generator_accounts[1].data.borrow().len(), 1000);
        assert!(generator_accounts[1]
            .data
            .borrow()
            .iter()
            .all(|data| *data == 56));
        assert_eq!(generator_accounts[1].rent_epoch, 567);
        assert!(generator_accounts[2].is_signer);
        assert!(generator_accounts[2].is_writable);
        assert!(!generator_accounts[2].executable);
        assert_eq!(generator_accounts[2].key, key1);
        assert_eq!(**generator_accounts[2].owner.borrow(), owner1);
        assert_eq!(**generator_accounts[2].lamports.borrow(), 100);
        assert_eq!(generator_accounts[2].data.borrow().len(), 10);
        assert!(generator_accounts[2]
            .data
            .borrow()
            .iter()
            .all(|data| *data == 32));
        assert_eq!(generator_accounts[2].rent_epoch, 1828);
        assert_eq!(generator_instruction_data.len(), 50);
        assert!(generator_instruction_data.iter().all(|data| *data == 224));

        assert_eq!(
            *solana_accounts[0].lamports.borrow() as *const u64,
            *generator_accounts[0].lamports.borrow() as *const u64
        );
        assert_eq!(
            *solana_accounts[1].lamports.borrow() as *const u64,
            *generator_accounts[1].lamports.borrow() as *const u64
        );
        assert_eq!(
            *solana_accounts[0].data.borrow() as *const [u8],
            *generator_accounts[0].data.borrow() as *const [u8]
        );
        assert_eq!(
            *solana_accounts[1].data.borrow() as *const [u8],
            *generator_accounts[1].data.borrow() as *const [u8]
        );
        assert_eq!(
            solana_accounts[0].owner as *const Pubkey,
            *generator_accounts[0].owner.borrow() as *const Pubkey
        );
        assert_eq!(
            solana_accounts[1].owner as *const Pubkey,
            *generator_accounts[1].owner.borrow() as *const Pubkey
        );
    }

    fn random_account_info(rng: &mut impl Rng) -> AccountInfo {
        let data_len: usize = rng.gen_range(16..=1024);
        let mut data = vec![0; data_len];
        for val in &mut data {
            *val = rng.gen();
        }
        AccountInfo {
            key: Pubkey::new(&rng.gen::<[u8; 32]>()),
            is_signer: rng.gen(),
            is_writable: rng.gen(),
            lamports: Rc::new(RefCell::new(Box::leak(Box::new(rng.gen())))),
            data: Rc::new(RefCell::new(Box::leak(data.into_boxed_slice()))),
            owner: Rc::new(RefCell::new(Box::leak(Box::new(Pubkey::new(
                &rng.gen::<[u8; 32]>(),
            ))))),
            executable: rng.gen(),
            rent_epoch: rng.gen(),
        }
    }
    pub fn account_info_eq(first: &AccountInfo, second: &AccountInfo) -> bool {
        first.key == second.key
            && first.is_signer == second.is_signer
            && first.is_writable == second.is_writable
            && **first.lamports.borrow() == **second.lamports.borrow()
            && **first.data.borrow() == **second.data.borrow()
            && **first.owner.borrow() == **second.owner.borrow()
            && first.executable == second.executable
            && first.rent_epoch == second.rent_epoch
    }

    #[test]
    fn is_signer_test() {
        let mut rng = thread_rng();
        let mut account_info = random_account_info(&mut rng);
        assert_eq!(account_info.is_signer, account_info.is_signer(()).unwrap());
        assert_eq!(account_info.is_signer, account_info.is_signer(All).unwrap());
        assert_eq!(account_info.is_signer, account_info.is_signer(Any).unwrap());
        assert_eq!(
            !account_info.is_signer,
            account_info.is_signer(NotAll).unwrap()
        );
        assert_eq!(
            !account_info.is_signer,
            account_info.is_signer(NotAny).unwrap()
        );
        account_info.is_signer = !account_info.is_signer;
        assert_eq!(account_info.is_signer, account_info.is_signer(()).unwrap());
        assert_eq!(account_info.is_signer, account_info.is_signer(All).unwrap());
        assert_eq!(account_info.is_signer, account_info.is_signer(Any).unwrap());
        assert_eq!(
            !account_info.is_signer,
            account_info.is_signer(NotAll).unwrap()
        );
        assert_eq!(
            !account_info.is_signer,
            account_info.is_signer(NotAny).unwrap()
        );
    }

    #[test]
    fn is_writable_test() {
        let mut rng = thread_rng();
        let mut account_info = random_account_info(&mut rng);
        assert_eq!(
            account_info.is_writable,
            account_info.is_writable(()).unwrap()
        );
        assert_eq!(
            account_info.is_writable,
            account_info.is_writable(All).unwrap()
        );
        assert_eq!(
            account_info.is_writable,
            account_info.is_writable(Any).unwrap()
        );
        assert_eq!(
            !account_info.is_writable,
            account_info.is_writable(NotAll).unwrap()
        );
        assert_eq!(
            !account_info.is_writable,
            account_info.is_writable(NotAny).unwrap()
        );
        account_info.is_signer = !account_info.is_signer;
        assert_eq!(
            account_info.is_writable,
            account_info.is_writable(()).unwrap()
        );
        assert_eq!(
            account_info.is_writable,
            account_info.is_writable(All).unwrap()
        );
        assert_eq!(
            account_info.is_writable,
            account_info.is_writable(Any).unwrap()
        );
        assert_eq!(
            !account_info.is_writable,
            account_info.is_writable(NotAll).unwrap()
        );
        assert_eq!(
            !account_info.is_writable,
            account_info.is_writable(NotAny).unwrap()
        );
    }

    #[test]
    fn is_owner_test() {
        let mut rng = thread_rng();
        let account_info = random_account_info(&mut rng);
        assert!(account_info
            .is_owner(**account_info.owner.borrow(), ())
            .unwrap());
        assert!(account_info
            .is_owner(**account_info.owner.borrow(), All)
            .unwrap());
        assert!(account_info
            .is_owner(**account_info.owner.borrow(), Any)
            .unwrap());
        assert!(!account_info
            .is_owner(**account_info.owner.borrow(), NotAll)
            .unwrap());
        assert!(!account_info
            .is_owner(**account_info.owner.borrow(), NotAny)
            .unwrap());
        assert!(!account_info
            .is_owner(Pubkey::new(&rng.gen::<[u8; 32]>()), ())
            .unwrap());
        assert!(!account_info
            .is_owner(Pubkey::new(&rng.gen::<[u8; 32]>()), All)
            .unwrap());
        assert!(!account_info
            .is_owner(Pubkey::new(&rng.gen::<[u8; 32]>()), Any)
            .unwrap());
        assert!(account_info
            .is_owner(Pubkey::new(&rng.gen::<[u8; 32]>()), NotAll)
            .unwrap());
        assert!(account_info
            .is_owner(Pubkey::new(&rng.gen::<[u8; 32]>()), NotAny)
            .unwrap());
    }

    #[test]
    fn owner_test() {
        let mut rng = thread_rng();
        let account_info = random_account_info(&mut rng);
        assert_eq!(
            account_info.owner(()).unwrap(),
            **account_info.owner.borrow()
        );
    }

    #[test]
    fn key_test() {
        let mut rng = thread_rng();
        let account_info = random_account_info(&mut rng);
        assert_eq!(account_info.key(()).unwrap(), account_info.key);
    }
}
