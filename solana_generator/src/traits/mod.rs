mod account;
mod account_argument;
mod error;
mod indexer;

pub use account::*;
pub use account_argument::*;
pub use error::*;
pub use indexer::*;

impl_indexed_for_unit!(u8[][]);
impl_indexed_for_unit!(u16[][]);
impl_indexed_for_unit!(u32[][]);
impl_indexed_for_unit!(u64[][]);
impl_indexed_for_unit!(u128[][]);
impl_indexed_for_unit!(usize[][]);
impl_indexed_for_unit!(i8[][]);
impl_indexed_for_unit!(i16[][]);
impl_indexed_for_unit!(i32[][]);
impl_indexed_for_unit!(i64[][]);
impl_indexed_for_unit!(i128[][]);
impl_indexed_for_unit!(isize[][]);
