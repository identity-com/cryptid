use proc_macro2::{Span, TokenStream};
use proc_macro_crate::{crate_name, FoundCrate};
use proc_macro_error::{abort, abort_call_site};
use quote::{quote, quote_spanned, ToTokens};
use std::convert::{TryFrom, TryInto};
use syn::parse::{Parse, ParseStream};
use syn::punctuated::Punctuated;
use syn::{
    parenthesized, parse_str, token, Attribute, Data, DataEnum, DeriveInput, Expr, Fields,
    Generics, Ident, Index, Token, Type,
};

pub struct AccountArgumentDerive {
    ident: Ident,
    generics: Generics,
    derive_type: AccountArgumentDeriveType,
    account_argument_attribute: AccountArgumentAttribute,
}
impl Parse for AccountArgumentDerive {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        let derive_input: DeriveInput = input.parse()?;

        let account_argument_attribute = AccountArgumentAttribute::try_from(derive_input.attrs)?;
        let derive_type =
            AccountArgumentDeriveType::from_data(derive_input.data, &derive_input.ident)?;

        Ok(Self {
            ident: derive_input.ident,
            generics: derive_input.generics,
            derive_type,
            account_argument_attribute,
        })
    }
}
impl AccountArgumentDerive {
    pub fn into_token_stream(self) -> TokenStream {
        let generator_crate =
            crate_name("solana_generator").expect("Could not find `solana_generator`");
        let crate_name = match generator_crate {
            FoundCrate::Itself => quote! { ::solana_generator },
            FoundCrate::Name(name) => {
                let ident = Ident::new(&name, Span::call_site());
                quote! { ::#ident }
            }
        };

        let ident = self.ident;
        let (impl_generics, ty_generics, where_clause) = self.generics.split_for_impl();

        let instruction_arg = {
            match &self.account_argument_attribute.instruction_data {
                None => quote! { () },
                Some(InstructionData::Single(attribute::InstructionField { ty, .. })) => {
                    quote! { #ty }
                }
                Some(InstructionData::Multi(fields)) => {
                    let types = fields.iter().map(|field| field.ty.clone());
                    quote! {
                        (#(#types,)*)
                    }
                }
            }
        };

        let instruction_naming = {
            match self.account_argument_attribute.instruction_data {
                None => quote! {},
                Some(InstructionData::Single(attribute::InstructionField { ident, .. })) => {
                    quote! { let #ident = arg__; }
                }
                Some(InstructionData::Multi(fields)) => {
                    let naming = fields.into_iter().enumerate().map(|(index, field)| {
                        let ident = field.ident;
                        let index = Index::from(index);
                        quote! {
                            let #ident = arg__.#index;
                        }
                    });
                    quote! {
                        #(#naming)*
                    }
                }
            }
        };

        let (fields_and_creation, write_back, keys) = {
            let AccountArgumentDeriveType::Struct(derive_struct) = self.derive_type.clone();
            match derive_struct {
                AccountArgumentDeriveStruct::Named { fields } => {
                    let mut idents = Vec::with_capacity(fields.len());
                    let mut instruction_data = Vec::with_capacity(fields.len());
                    let mut signers = Vec::with_capacity(fields.len());
                    let mut writables = Vec::with_capacity(fields.len());
                    let mut owners_index = Vec::with_capacity(fields.len());
                    let mut owners = Vec::with_capacity(fields.len());
                    let mut verification = Vec::with_capacity(fields.len());
                    let mut types = Vec::with_capacity(fields.len());
                    for field in fields {
                        idents.push(field.0);
                        instruction_data.push(field.1.instruction_data);
                        signers.push(field.1.signer);
                        writables.push(field.1.writable);
                        owners_index.push(Vec::with_capacity(field.1.owner.len()));
                        owners.push(Vec::with_capacity(field.1.owner.len()));
                        for (index, owner) in field.1.owner {
                            owners_index.last_mut().unwrap().push(index);
                            owners.last_mut().unwrap().push(owner);
                        }
                        types.push(field.2);
                    }
                    let map_func = |val: Indexes| match val {
                        Indexes::All(span) => {
                            quote_spanned! { span.span() => #crate_name::All }
                        }
                        Indexes::NotAll(span) => {
                            quote_spanned! { span.span() => #crate_name::NotAll }
                        }
                        Indexes::Any(span) => {
                            quote_spanned! { span.span() => #crate_name::Any }
                        }
                        Indexes::NotAny(span) => {
                            quote_spanned! { span.span() => #crate_name::NotAny }
                        }
                        Indexes::Expr(expr) => quote! { #expr },
                    };
                    let signers = signers.into_iter().map(|val| val.into_iter().map(map_func));
                    let writables = writables
                        .into_iter()
                        .map(|val| val.into_iter().map(map_func));
                    let owners_index = owners_index
                        .into_iter()
                        .map(|val| val.into_iter().map(map_func));

                    for ((((ident, signer), writable), owner), owner_index) in idents
                        .clone()
                        .into_iter()
                        .zip(signers)
                        .zip(writables)
                        .zip(owners)
                        .zip(owners_index)
                    {
                        verification.push(quote! {
                            #(#crate_name::assert_is_signer(&#ident, #signer)?;)*
                            #(#crate_name::assert_is_writable(&#ident, #writable)?;)*
                            #(#crate_name::assert_is_owner(&#ident, #owner, #owner_index)?;)*
                        })
                    }

                    (
                        quote! {
                            #(let #idents = <#types as #crate_name::FromAccounts<_>>::from_accounts(program_id, infos__, #instruction_data)?;)*
                            #(#verification)*
                            Ok(Self{
                                #(#idents,)*
                            })
                        },
                        quote! {
                            #(<#types as #crate_name::AccountArgument>::write_back(self.#idents, program_id, system_program)?;)*
                        },
                        quote! {
                            #(<#types as #crate_name::AccountArgument>::add_keys(&self.#idents, &mut add__)?;)*
                        },
                    )
                }
                AccountArgumentDeriveStruct::Unnamed { fields } => {
                    let index = (0..fields.len()).map(Index::from);
                    let mut instruction_data = Vec::with_capacity(fields.len());
                    let mut signers = Vec::with_capacity(fields.len());
                    let mut writables = Vec::with_capacity(fields.len());
                    let mut owners_index = Vec::with_capacity(fields.len());
                    let mut owners = Vec::with_capacity(fields.len());
                    let mut verification = Vec::with_capacity(fields.len());
                    let mut types = Vec::with_capacity(fields.len());
                    for field in fields {
                        instruction_data.push(field.0.instruction_data);
                        signers.push(field.0.signer);
                        writables.push(field.0.writable);
                        owners_index.push(Vec::with_capacity(field.0.owner.len()));
                        owners.push(Vec::with_capacity(field.0.owner.len()));
                        for (index, owner) in field.0.owner {
                            owners_index.last_mut().unwrap().push(index);
                            owners.last_mut().unwrap().push(owner);
                        }
                        types.push(field.1);
                    }
                    let map_func = |val: Indexes| match val {
                        Indexes::All(span) => {
                            quote_spanned! { span.span() => #crate_name::All }
                        }
                        Indexes::NotAll(span) => {
                            quote_spanned! { span.span() => #crate_name::NotAll }
                        }
                        Indexes::Any(span) => {
                            quote_spanned! { span.span() => #crate_name::Any }
                        }
                        Indexes::NotAny(span) => {
                            quote_spanned! { span.span() => #crate_name::NotAny }
                        }
                        Indexes::Expr(expr) => quote! { #expr },
                    };
                    let signers = signers.into_iter().map(|val| val.into_iter().map(map_func));
                    let writables = writables
                        .into_iter()
                        .map(|val| val.into_iter().map(map_func));
                    let owners_index = owners_index
                        .into_iter()
                        .map(|val| val.into_iter().map(map_func));

                    for ((((index, signer), writable), owner), owner_index) in index
                        .clone()
                        .into_iter()
                        .zip(signers)
                        .zip(writables)
                        .zip(owners)
                        .zip(owners_index)
                    {
                        verification.push(quote! {
                            #(#crate_name::assert_is_signer(&out.#index, #signer)?;)*
                            #(#crate_name::assert_is_writable(&out.#index, #writable)?;)*
                            #(#crate_name::assert_is_owner(&out.#index, #owner, #owner_index)?;)*
                        })
                    }
                    let index_clone = index.clone();
                    (
                        quote! {
                            let out = Self(
                                #(<#types as #crate_name::FromAccounts<_>>::from_accounts(program_id, infos__, #instruction_data)?,)*
                            );
                            #(#verification)*
                            Ok(out)
                        },
                        quote! {
                            #(<#types as #crate_name::AccountArgument>::write_back(self.#index, program_id, system_program)?;)*
                        },
                        quote! {
                            #(<#types as #crate_name::AccountArgument>::add_keys(&self.#index_clone, &mut add__)?;)*
                        },
                    )
                }
                AccountArgumentDeriveStruct::Unit => (quote! { Ok(Self) }, quote! {}, quote! {}),
            }
        };

        quote! {
            #[automatically_derived]
            impl #impl_generics AccountArgument for #ident #ty_generics #where_clause{
                fn write_back(
                    self,
                    program_id: #crate_name::solana_program::pubkey::Pubkey,
                    system_program: Option<&#crate_name::SystemProgram>,
                ) -> #crate_name::GeneratorResult<()>{
                    #write_back
                    Ok(())
                }

                fn add_keys(
                    &self,
                    mut add__: impl ::core::ops::FnMut(#crate_name::solana_program::pubkey::Pubkey) -> #crate_name::GeneratorResult<()>
                ) -> #crate_name::GeneratorResult<()>{
                    #keys
                    Ok(())
                }
            }

            #[automatically_derived]
            impl #impl_generics #crate_name::FromAccounts<#instruction_arg> for #ident #where_clause{
                fn from_accounts(
                    program_id: #crate_name::solana_program::pubkey::Pubkey,
                    infos__: &mut impl #crate_name::AccountInfoIterator,
                    arg__: #instruction_arg,
                ) -> #crate_name::GeneratorResult<Self>{
                    #instruction_naming
                    #fields_and_creation
                }
            }
        }
    }
}

#[derive(Clone)]
enum AccountArgumentDeriveType {
    // Enum(AccountArgumentDeriveEnum),
    Struct(AccountArgumentDeriveStruct),
}
impl AccountArgumentDeriveType {
    fn from_data(data: Data, ident: &Ident) -> syn::Result<Self> {
        match data {
            Data::Struct(data_struct) => Ok(Self::Struct(data_struct.fields.try_into()?)),
            Data::Enum(_data_enum) => {
                abort_call_site!("Cannot derive `AccountArgument` for enum {}", ident)
                // Ok(Self::Enum(data_enum.try_into()?))
            }
            Data::Union(_) => {
                abort_call_site!("Cannot derive `AccountArgument` for union {}", ident)
            }
        }
    }
}

struct AccountArgumentDeriveEnum {
    _variants: Vec<(
        Ident,
        AccountArgumentEnumAttribute,
        AccountArgumentDeriveStruct,
        Option<Expr>,
    )>,
}
impl TryFrom<DataEnum> for AccountArgumentDeriveEnum {
    type Error = syn::Error;

    fn try_from(value: DataEnum) -> Result<Self, Self::Error> {
        let mut variants = Vec::with_capacity(value.variants.len());
        for variant in value.variants {
            let attribute = variant.attrs.try_into()?;

            variants.push((
                variant.ident,
                attribute,
                variant.fields.try_into()?,
                variant.discriminant.map(|(_, discriminant)| discriminant),
            ))
        }
        Ok(Self {
            _variants: variants,
        })
    }
}

#[derive(Clone)]
enum AccountArgumentDeriveStruct {
    Named {
        fields: Vec<(Ident, AccountArgumentFieldAttribute, Type)>,
    },
    Unnamed {
        fields: Vec<(AccountArgumentFieldAttribute, Type)>,
    },
    Unit,
}
impl TryFrom<Fields> for AccountArgumentDeriveStruct {
    type Error = syn::Error;

    fn try_from(value: Fields) -> Result<Self, Self::Error> {
        match value {
            Fields::Named(named) => Ok(Self::Named {
                fields: named
                    .named
                    .into_iter()
                    .map(|field| Ok((field.ident.unwrap(), field.attrs.try_into()?, field.ty)))
                    .collect::<Result<_, Self::Error>>()?,
            }),
            Fields::Unnamed(unnamed) => Ok(Self::Unnamed {
                fields: unnamed
                    .unnamed
                    .into_iter()
                    .map(|field| Ok((field.attrs.try_into()?, field.ty)))
                    .collect::<Result<_, Self::Error>>()?,
            }),
            Fields::Unit => Ok(Self::Unit),
        }
    }
}

struct AccountArgumentAttribute {
    instruction_data: Option<InstructionData>,
}
impl AccountArgumentAttribute {
    const IDENT: &'static str = "account_argument";
}
impl TryFrom<Vec<Attribute>> for AccountArgumentAttribute {
    type Error = syn::Error;

    fn try_from(from: Vec<Attribute>) -> Result<Self, Self::Error> {
        match find_attribute(from, Self::IDENT) {
            None => Ok(Self::default()),
            Some(attribute) => attribute.parse_args(),
        }
    }
}
impl Parse for AccountArgumentAttribute {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        let punctuated = input.parse_terminated::<_, Token![,]>(attribute::Items::parse)?;
        let mut instruction_data = None;
        for item in punctuated {
            if let Some((scope, name)) = match item {
                attribute::Items::InstructionData { ident, field, .. } => instruction_data
                    .replace(InstructionData::Single(field))
                    .map(|_| (ident, attribute::Items::INSTRUCTION_DATA_IDENT)),
                attribute::Items::InstructionDataTupple { ident, fields, .. } => instruction_data
                    .replace(InstructionData::Multi(fields.into_iter().collect()))
                    .map(|_| (ident, attribute::Items::INSTRUCTION_DATA_IDENT)),
            } {
                abort!(scope, "Multiple `{}` arguments for `{}`", name, Self::IDENT);
            }
        }
        Ok(Self { instruction_data })
    }
}
impl Default for AccountArgumentAttribute {
    fn default() -> Self {
        Self {
            instruction_data: None,
        }
    }
}

#[allow(clippy::large_enum_variant)]
enum InstructionData {
    Multi(Vec<attribute::InstructionField>),
    Single(attribute::InstructionField),
}

mod attribute {
    use super::*;

    pub enum Items {
        InstructionData {
            ident: Ident,
            equals: Token![=],
            field: InstructionField,
        },
        InstructionDataTupple {
            ident: Ident,
            equals: Token![=],
            paren: token::Paren,
            fields: Punctuated<InstructionField, Token![,]>,
        },
    }
    impl Items {
        pub const INSTRUCTION_DATA_IDENT: &'static str = "instruction_data";
    }
    impl Parse for Items {
        fn parse(input: ParseStream) -> syn::Result<Self> {
            let ident: Ident = input.parse()?;
            if ident == Self::INSTRUCTION_DATA_IDENT {
                let equals = input.parse()?;
                let lookahead = input.lookahead1();
                if lookahead.peek(token::Paren) {
                    let content;
                    let paren = parenthesized!(content in input);
                    let fields = content.parse_terminated(InstructionField::parse)?;
                    Ok(Self::InstructionDataTupple {
                        ident,
                        equals,
                        paren,
                        fields,
                    })
                } else if lookahead.peek(Ident) {
                    let field = input.parse()?;
                    Ok(Self::InstructionData {
                        ident,
                        equals,
                        field,
                    })
                } else {
                    Err(lookahead.error())
                }
            } else {
                abort!(
                    ident,
                    "Unknown `{}` argument `{}`",
                    AccountArgumentAttribute::IDENT,
                    ident
                )
            }
        }
    }

    #[derive(Clone)]
    pub struct InstructionField {
        pub ident: Ident,
        pub colon: Token![:],
        pub ty: Type,
    }
    impl Parse for InstructionField {
        fn parse(input: ParseStream) -> syn::Result<Self> {
            Ok(Self {
                ident: input.parse()?,
                colon: input.parse()?,
                ty: input.parse()?,
            })
        }
    }
    impl ToTokens for InstructionField {
        fn to_tokens(&self, tokens: &mut TokenStream) {
            self.ident.to_tokens(tokens);
            self.colon.to_tokens(tokens);
            self.ty.to_tokens(tokens);
        }
    }
}

struct AccountArgumentEnumAttribute {}
impl TryFrom<Vec<Attribute>> for AccountArgumentEnumAttribute {
    type Error = syn::Error;

    fn try_from(_value: Vec<Attribute>) -> Result<Self, Self::Error> {
        todo!()
    }
}

#[derive(Clone)]
struct AccountArgumentFieldAttribute {
    instruction_data: Expr,
    signer: Vec<Indexes>,
    writable: Vec<Indexes>,
    owner: Vec<(Indexes, Expr)>,
}
impl AccountArgumentFieldAttribute {
    const IDENT: &'static str = "account_argument";
}
impl TryFrom<Vec<Attribute>> for AccountArgumentFieldAttribute {
    type Error = syn::Error;

    fn try_from(value: Vec<Attribute>) -> Result<Self, Self::Error> {
        match find_attribute(value, Self::IDENT) {
            None => Ok(Self::default()),
            Some(attribute) => attribute.parse_args(),
        }
    }
}
impl Parse for AccountArgumentFieldAttribute {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        let punctuated = input.parse_terminated::<_, Token![,]>(field_attribute::Items::parse)?;
        let mut instruction_data = None;
        let mut signer = Vec::new();
        let mut writable = Vec::new();
        let mut owner = Vec::new();
        for item in punctuated {
            if let Some((scope, name)) = match item {
                field_attribute::Items::InstructionData { ident, expr, .. } => instruction_data
                    .replace(expr)
                    .map(|_| (ident, field_attribute::Items::INSTRUCTION_DATA_IDENT)),
                field_attribute::Items::Signer { optional_index, .. } => {
                    signer.push(optional_index.map_or_else(
                        || Indexes::All(Ident::new(Indexes::ALL_IDENT, Span::call_site())),
                        |val| val.1,
                    ));
                    None
                }
                field_attribute::Items::Writable { optional_index, .. } => {
                    writable.push(optional_index.map_or_else(
                        || Indexes::All(Ident::new(Indexes::ALL_IDENT, Span::call_site())),
                        |val| val.1,
                    ));
                    None
                }
                field_attribute::Items::Owner {
                    optional_index,
                    owner: owner_expr,
                    ..
                } => {
                    owner.push((
                        optional_index.map_or_else(
                            || Indexes::All(Ident::new(Indexes::ALL_IDENT, Span::call_site())),
                            |val| val.1,
                        ),
                        *owner_expr,
                    ));
                    None
                }
            } {
                abort!(scope, "Multiple `{}` arguments for `{}`", name, Self::IDENT);
            }
        }
        Ok(Self {
            instruction_data: instruction_data.unwrap_or_else(|| parse_str("()").unwrap()),
            signer,
            writable,
            owner,
        })
    }
}
impl Default for AccountArgumentFieldAttribute {
    fn default() -> Self {
        Self {
            instruction_data: parse_str("()").unwrap(),
            signer: vec![],
            writable: vec![],
            owner: vec![],
        }
    }
}

#[derive(Clone)]
pub enum Indexes {
    All(Ident),
    NotAll(Ident),
    Any(Ident),
    NotAny(Ident),
    Expr(Box<Expr>),
}
impl Indexes {
    pub const ALL_IDENT: &'static str = "all";
    pub const NOT_ALL_IDENT: &'static str = "not_all";
    pub const ANY_IDENT: &'static str = "any";
    pub const NOT_ANY_IDENT: &'static str = "not_any";
}
impl Parse for Indexes {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        let lookahead = input.lookahead1();
        if lookahead.peek(Ident) {
            let fork = input.fork();
            let ident: Ident = fork.parse()?;
            if ident == Self::ALL_IDENT {
                Ok(Self::All(input.parse()?))
            } else if ident == Self::NOT_ALL_IDENT {
                Ok(Self::NotAll(input.parse()?))
            } else if ident == Self::ANY_IDENT {
                Ok(Self::Any(input.parse()?))
            } else if ident == Self::NOT_ANY_IDENT {
                Ok(Self::NotAny(input.parse()?))
            } else {
                Ok(Self::Expr(Box::new(input.parse()?)))
            }
        } else {
            Ok(Self::Expr(Box::new(input.parse()?)))
        }
    }
}

mod field_attribute {
    use super::*;

    pub enum Items {
        InstructionData {
            ident: Ident,
            equals: Token![=],
            expr: Expr,
        },
        Signer {
            ident: Ident,
            optional_index: Option<(token::Paren, Indexes)>,
        },
        Writable {
            ident: Ident,
            optional_index: Option<(token::Paren, Indexes)>,
        },
        Owner {
            ident: Ident,
            optional_index: Option<(token::Paren, Indexes)>,
            equals: Token![=],
            owner: Box<Expr>,
        },
    }
    impl Items {
        pub const INSTRUCTION_DATA_IDENT: &'static str = "instruction_data";
        pub const SIGNER_IDENT: &'static str = "signer";
        pub const WRITABLE_IDENT: &'static str = "writable";
        pub const OWNER_IDENT: &'static str = "owner";
    }
    impl Parse for Items {
        fn parse(input: ParseStream) -> syn::Result<Self> {
            let fork = input.fork();
            let ident: Ident = fork.parse()?;
            if ident == Self::INSTRUCTION_DATA_IDENT {
                Ok(Self::InstructionData {
                    ident: input.parse()?,
                    equals: input.parse()?,
                    expr: input.parse()?,
                })
            } else if ident == Self::SIGNER_IDENT {
                let ident = input.parse()?;
                let lookahead = input.lookahead1();
                let optional_index = if lookahead.peek(token::Paren) {
                    let content;
                    let paren = parenthesized!(content in input);
                    let expr = content.parse()?;
                    Some((paren, expr))
                } else {
                    None
                };
                Ok(Self::Signer {
                    ident,
                    optional_index,
                })
            } else if ident == Self::WRITABLE_IDENT {
                let ident = input.parse()?;
                let lookahead = input.lookahead1();
                let optional_index = if lookahead.peek(token::Paren) {
                    let content;
                    let paren = parenthesized!(content in input);
                    let expr = content.parse()?;
                    Some((paren, expr))
                } else {
                    None
                };
                Ok(Self::Writable {
                    ident,
                    optional_index,
                })
            } else if ident == Self::OWNER_IDENT {
                let ident = input.parse()?;
                let lookahead = input.lookahead1();
                let optional_index = if lookahead.peek(token::Paren) {
                    let content;
                    let paren = parenthesized!(content in input);
                    let expr = content.parse()?;
                    Some((paren, expr))
                } else {
                    None
                };
                let equals = input.parse()?;
                let owner = input.parse()?;
                Ok(Self::Owner {
                    ident,
                    optional_index,
                    equals,
                    owner,
                })
            } else {
                abort!(
                    ident,
                    "Unknown `{}` argument `{}`",
                    AccountArgumentFieldAttribute::IDENT,
                    ident
                )
            }
        }
    }
}

fn find_attribute(attributes: Vec<Attribute>, name: &str) -> Option<Attribute> {
    let mut account_argument_attributes = attributes.into_iter().filter(|attribute| {
        attribute
            .path
            .get_ident()
            .map_or(false, |ident| ident == name)
    });
    let out = account_argument_attributes.next();
    if account_argument_attributes.next().is_some() {
        let attributes = quote! {
            #(#account_argument_attributes)*
        };
        abort!(attributes, "Multiple `{}` attributes", name);
    }
    out
}
