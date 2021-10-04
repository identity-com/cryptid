use proc_macro2::{Span, TokenStream};
use proc_macro_crate::{crate_name, FoundCrate};
use quote::quote;
use quote::ToTokens;
use sha2::{Digest, Sha256};
use syn::parse::{Parse, ParseStream};
use syn::punctuated::Punctuated;
use syn::token;
use syn::{parenthesized, Token};
use syn::{DeriveInput, Expr, Generics, Ident};

pub struct AccountDerive {
    ident: Ident,
    generics: Generics,
    account_attribute: AccountAttribute,
}
impl Parse for AccountDerive {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        let derive_input: DeriveInput = input.parse()?;
        let account_path: Ident = syn::parse_str(AccountAttribute::IDENT).unwrap();
        let mut account_attribute = None;
        for attr in derive_input.attrs {
            if attr.path.is_ident(&account_path)
                && account_attribute
                    .replace(syn::parse2(attr.tokens)?)
                    .is_some()
            {
                return Err(syn::Error::new_spanned(
                    attr.path,
                    format!("Duplicate `{}` attribute", AccountAttribute::IDENT),
                ));
            }
        }

        Ok(Self {
            ident: derive_input.ident,
            generics: derive_input.generics,
            account_attribute: account_attribute.unwrap_or_default(),
        })
    }
}
impl AccountDerive {
    pub fn into_token_stream(self) -> proc_macro2::TokenStream {
        let generator_crate =
            crate_name("solana_generator").expect("Could not find `solana_generator`");
        let crate_name = match generator_crate {
            FoundCrate::Itself => quote! { ::solana_generator },
            FoundCrate::Name(name) => {
                let ident = Ident::new(&name, Span::call_site());
                quote! { ::#ident }
            }
        };

        let ident = &self.ident;
        let (impl_generics, ty_generics, where_clause) = self.generics.split_for_impl();
        let discriminant = self
            .account_attribute
            .discriminant
            .as_ref()
            .map(|discriminant| discriminant.value.to_token_stream())
            .unwrap_or_else(|| {
                let mut hasher = Sha256::new();
                hasher.update(self.ident.to_string().as_bytes());
                let bytes = hasher.finalize();
                let (byte0, byte1, byte2, byte3) = (bytes[0], bytes[1], bytes[2], bytes[3]);
                quote! { [#byte0, #byte1, #byte2, #byte3] }
            });
        quote! {
            #[automatically_derived]
            impl #impl_generics Account for #ident #ty_generics #where_clause{
                const DISCRIMINANT: #crate_name::discriminant::Discriminant<'static> = #crate_name::discriminant::Discriminant::from_array(&#discriminant);
            }
        }
    }
}

struct AccountAttribute {
    paren: token::Paren,
    attribute_args: Punctuated<AccountAttributeItem, Token![,]>,
    discriminant: Option<Discriminant>,
}
impl AccountAttribute {
    const IDENT: &'static str = "account";
}
impl Parse for AccountAttribute {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        if !input.peek(token::Paren) {
            return Err(input.error(format!(
                "Attribute `{}` requires parenthesized arguments",
                Self::IDENT
            )));
        }
        let content;
        let paren = parenthesized!(content in input);
        let attribute_args: Punctuated<_, Token![,]> =
            content.parse_terminated(AccountAttributeItem::parse)?;
        let mut discriminant = None;
        for arg in &attribute_args {
            match arg {
                AccountAttributeItem::Discriminant(new_discriminant) => {
                    if discriminant.replace(new_discriminant.clone()).is_some() {
                        return Err(syn::Error::new_spanned(
                            new_discriminant,
                            format!(
                                "Duplicate `{}` argument for `{}`",
                                Discriminant::IDENT,
                                Self::IDENT
                            ),
                        ));
                    }
                }
            }
        }

        Ok(Self {
            paren,
            attribute_args,
            discriminant,
        })
    }
}
impl ToTokens for AccountAttribute {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        self.paren.surround(tokens, |tokens| {
            self.attribute_args.to_tokens(tokens);
        });
    }
}
impl Default for AccountAttribute {
    fn default() -> Self {
        Self {
            paren: Default::default(),
            attribute_args: Default::default(),
            discriminant: None,
        }
    }
}

#[derive(Clone)]
enum AccountAttributeItem {
    Discriminant(Discriminant),
}
impl Parse for AccountAttributeItem {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        let fork = input.fork();
        let ident: Ident = fork.parse()?;
        if ident == Discriminant::IDENT {
            Ok(Self::Discriminant(input.parse::<Discriminant>()?))
        } else {
            Err(syn::Error::new_spanned(
                &ident,
                format!(
                    "Unknown argument `{}` for attribute `{}`",
                    ident,
                    AccountAttribute::IDENT
                ),
            ))
        }
    }
}
impl ToTokens for AccountAttributeItem {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        match self {
            AccountAttributeItem::Discriminant(discriminant) => discriminant.to_tokens(tokens),
        }
    }
}

#[derive(Clone)]
struct Discriminant {
    ident: Ident,
    equals: Token![=],
    value: Expr,
}
impl Discriminant {
    const IDENT: &'static str = "discriminant";
}
impl Parse for Discriminant {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        Ok(Self {
            ident: input.parse()?,
            equals: input.parse()?,
            value: input.parse()?,
        })
    }
}
impl ToTokens for Discriminant {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        self.ident.to_tokens(tokens);
        self.equals.to_tokens(tokens);
        self.value.to_tokens(tokens);
    }
}
