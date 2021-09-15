pub use solana_generator_derive::Error;
use solana_program::program_error::ProgramError;

/// A version of [`Result`] returned by many [`solana_generator`] functions.
pub type GeneratorResult<T> = Result<T, Box<dyn Error>>;

/// An error that can be returned on the chain
pub trait Error {
    /// The message the error represents
    fn message(&self) -> String;
    /// Turns this into a returnable error
    fn to_program_error(&self) -> ProgramError;
}

impl Error for ProgramError {
    fn message(&self) -> String {
        format!("{}", self)
    }

    fn to_program_error(&self) -> ProgramError {
        self.clone()
    }
}
impl<T> From<T> for Box<dyn Error>
where
    T: Error + 'static,
{
    fn from(from: T) -> Self {
        Box::new(from)
    }
}
impl From<std::io::Error> for Box<dyn Error> {
    fn from(from: std::io::Error) -> Self {
        ProgramError::from(from).into()
    }
}
