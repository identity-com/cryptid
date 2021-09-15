use crate::{
    AccountArgument, AllAny, GeneratorResult, MultiIndexableAccountArgument,
    SingleIndexableAccountArgument, SystemProgram,
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
                let is_signer = Self::read_value(input, &mut offset);
                let is_writable = Self::read_value(input, &mut offset);
                let executable = Self::read_value(input, &mut offset);
                offset += size_of::<u32>();
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
            owner: &*(self.owner.borrow().deref() as *const &mut solana_program::pubkey::Pubkey
                as *const solana_program::pubkey::Pubkey),
            executable: self.executable,
            rent_epoch: self.rent_epoch,
        }
    }
}
impl AccountArgument for AccountInfo {
    type InstructionArg = ();

    fn from_account_infos(
        _program_id: Pubkey,
        infos: &mut impl Iterator<Item = AccountInfo>,
        _data: &mut &[u8],
        _arg: Self::InstructionArg,
    ) -> GeneratorResult<Self> {
        match infos.next() {
            None => Err(ProgramError::NotEnoughAccountKeys.into()),
            Some(info) => Ok(info),
        }
    }

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
