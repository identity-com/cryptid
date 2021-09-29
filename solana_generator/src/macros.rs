/// Builds an instruction.
/// Used to shorten [`InstructionList::build_instruction`](crate::InstructionList::build_instruction) invocations.
#[macro_export]
macro_rules! build_instruction {
    ($program_id:expr, $instruction:ty, $instruction_ident:ident($instruction_arg:expr)) => {
        <$instruction as $crate::InstructionList>::build_instruction(
            $program_id,
            <$instruction as $crate::InstructionList>::BuildEnum::$instruction_ident(
                $instruction_arg,
            ),
        )
    };
}

macro_rules! impl_indexed_for_unit {
    ($ty:ty, yield no single [$(gen: $($gen:ident),+)?]  [$(where: $($where_path:path: $where_bound:path),+)?] ) => {
        impl<T__, $($($gen,)*)?> $crate::MultiIndexableAccountArgument<$ty> for T__
        where
            T__: $crate::MultiIndexableAccountArgument<($ty, ())>,
            $($($where_path: $where_bound,)+)?
        {
            #[inline]
            fn is_signer(&self, indexer: $ty) -> $crate::GeneratorResult<bool> {
                <Self as $crate::MultiIndexableAccountArgument<($ty, ())>>::is_signer(self, (indexer, ()))
            }

            #[inline]
            fn is_writable(&self, indexer: $ty) -> $crate::GeneratorResult<bool> {
                <Self as $crate::MultiIndexableAccountArgument<($ty, ())>>::is_writable(self, (indexer, ()))
            }

            #[inline]
            fn is_owner(&self, owner: $crate::solana_program::pubkey::Pubkey, indexer: $ty) -> $crate::GeneratorResult<bool> {
                <Self as $crate::MultiIndexableAccountArgument<($ty, ())>>::is_owner(self, owner, (indexer, ()))
            }
        }
    };
    ($ty:ty [$(gen: $($gen:ident),+)?]  [$(where: $($where_path:path: $($where_bound:path),+),+)?]) => {
        impl_indexed_for_unit!($ty, yield no single [$($($gen,)*)?] [$(where: $($where_path: $($where_bound,)+),+)?]);
        impl<T__, $($($gen,)*)?> $crate::SingleIndexableAccountArgument<$ty> for T__
        where
            T__: $crate::SingleIndexableAccountArgument<($ty, ())>
            $($($where_path: $where_bound)+)?
        {
            #[inline]
            fn owner(&self, indexer: $ty) -> $crate::GeneratorResult<$crate::solana_program::pubkey::Pubkey> {
                <Self as $crate::SingleIndexableAccountArgument<($ty, ())>>::owner(self, (indexer, ()))
            }

            #[inline]
            fn key(&self, indexer: $ty) -> $crate::GeneratorResult<$crate::solana_program::pubkey::Pubkey> {
                <Self as $crate::SingleIndexableAccountArgument<($ty, ())>>::key(self, (indexer, ()))
            }
        }
    }
}
