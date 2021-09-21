#[allow(missing_docs)]
pub trait InstructionList: Copy {
    fn discriminant(self) -> &'static [u8];
}
