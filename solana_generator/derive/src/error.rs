use proc_macro2::{Ident, Span, TokenStream};
use proc_macro_crate::{crate_name, FoundCrate};
use proc_macro_error::emit_warning;
use quote::{quote, ToTokens};
use syn::parse::{Parse, ParseStream};
use syn::punctuated::Punctuated;
use syn::{parenthesized, Expr, Field, Token};
use syn::{token, Data, DeriveInput, Fields, Generics, LitInt, LitStr};

pub struct ErrorDerive {
    ident: Ident,
    generics: Generics,
    error_attribute: Option<ErrorAttribute>,
    variant_messages: Vec<(Ident, Fields, Option<ErrorMsgAttribute>)>,
}
impl ErrorDerive {
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

        let ident = self.ident;
        let (impl_generics, ty_generics, where_clause) = self.generics.split_for_impl();

        let start = match self.error_attribute.map(|ea| ea.start).flatten() {
            None => LitInt::new("300", Span::call_site()),
            Some(start) => start.parse.value,
        };

        let mut messages = Vec::with_capacity(self.variant_messages.len());
        let mut indexes = Vec::with_capacity(self.variant_messages.len());

        for (index, (ident, fields, message_attr)) in self.variant_messages.into_iter().enumerate()
        {
            let mut fields_unnamed = false;
            let (fields_enumerated, fields_blank) = match fields {
                Fields::Named(named) => {
                    let names = named.named.into_iter().map(|named: Field| {
                        named.ident.expect("Named fields should have identifier")
                    });
                    (quote! { { #(#names,)* }}, quote! { { .. } })
                }
                Fields::Unnamed(unnamed) => {
                    fields_unnamed = true;
                    let range =
                        (0..unnamed.unnamed.len()).map(|_| Ident::new("_", Span::call_site()));
                    let out = quote! { ( #(#range, )* ) };
                    (out.clone(), out)
                }
                Fields::Unit => (TokenStream::new(), TokenStream::new()),
            };

            let message_enum = message_attr
                .clone()
                .map(|attr| attr.message)
                .unwrap_or_else(|| ErrorMsg::Message {
                    message: LitStr::new(ident.to_string().as_str(), Span::call_site()),
                });

            messages.push(match message_enum.clone() {
                ErrorMsg::Message { message } => {
                    quote! { Self::#ident #fields_enumerated => <str as ::std::string::ToString>::to_string(#message) }
                }
                ErrorMsg::FormatMessage {
                    message,
                    comma,
                    format_args,
                } => {
                    if fields_unnamed {
                        emit_warning!(
                            message_enum,
                            "Unnamed fields cannot be accessed from `{}` attribute",
                            ErrorAttribute::IDENT
                        );
                    }
                    quote! {
                        Self::#ident #fields_enumerated => ::std::format!(#message #comma #format_args)
                    }
                }
            });

            let index = index as u32;

            indexes.push(quote! {Self::#ident #fields_blank => #index + #start})
        }

        quote! {
            #[automatically_derived]
            impl #impl_generics Error for #ident #ty_generics #where_clause{
                fn message(&self) -> ::std::string::String{
                    match self{
                        #( #messages, )*
                    }
                }

                fn to_program_error(&self) -> #crate_name::solana_program::program_error::ProgramError{
                    #crate_name::solana_program::program_error::ProgramError::Custom(match self{
                        #(#indexes,)*
                    })
                }
            }
        }
    }
}
impl Parse for ErrorDerive {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        let error_ident: Ident = syn::parse_str(ErrorAttribute::IDENT)?;
        let derive_input: DeriveInput = input.parse()?;
        let enum_data = match derive_input.data {
            Data::Enum(enum_data) => enum_data,
            _ => {
                return Err(syn::Error::new(
                    Span::call_site(),
                    "Error derive only supports enums.",
                ))
            }
        };
        let mut error_attribute = None;
        for attr in derive_input.attrs {
            if attr.path.is_ident(&error_ident)
                && error_attribute.replace(syn::parse2(attr.tokens)?).is_some()
            {
                return Err(syn::Error::new_spanned(
                    attr.path,
                    format!("Duplicate `{}` attribute", ErrorAttribute::IDENT),
                ));
            }
        }

        let mut variant_messages = Vec::with_capacity(enum_data.variants.len());
        let error_msg_ident: Ident = syn::parse_str(ErrorMsgAttribute::IDENT)?;
        for variant in enum_data.variants {
            if let Some(attr) = variant
                .attrs
                .into_iter()
                .find(|attr| attr.path.is_ident(&error_msg_ident))
            {
                variant_messages.push((
                    variant.ident,
                    variant.fields,
                    Some(syn::parse2(attr.tokens)?),
                ));
            } else {
                variant_messages.push((variant.ident, variant.fields, None));
            }
        }

        Ok(Self {
            ident: derive_input.ident,
            generics: derive_input.generics,
            error_attribute,
            variant_messages,
        })
    }
}

struct ErrorAttribute {
    paren: token::Paren,
    arguments: Punctuated<ErrorAttributeItem, Token![,]>,
    start: Option<Start>,
}
impl ErrorAttribute {
    const IDENT: &'static str = "error";
}
impl Parse for ErrorAttribute {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        let content;
        let paren = parenthesized!(content in input);
        let arguments = content.parse_terminated(ErrorAttributeItem::parse)?;

        let mut start = None;

        for argument in &arguments {
            match argument {
                ErrorAttributeItem::Start(new_start) => {
                    if start.replace(new_start.clone()).is_some() {
                        return Err(syn::Error::new_spanned(
                            new_start,
                            format!(
                                "Duplicate `{}` argument for `{}`",
                                Start::IDENT,
                                Self::IDENT
                            ),
                        ));
                    }
                }
            }
        }

        Ok(Self {
            paren,
            arguments,
            start,
        })
    }
}
impl ToTokens for ErrorAttribute {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        self.paren
            .surround(tokens, |tokens| self.arguments.to_tokens(tokens))
    }
}

#[derive(Clone)]
enum ErrorAttributeItem {
    Start(Start),
}
impl Parse for ErrorAttributeItem {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        let ident: Ident = input.parse()?;
        match ident.to_string().as_str() {
            Start::IDENT => Ok(Self::Start(input.parse::<StartParse>()?.into_start(ident))),
            x => Err(syn::Error::new_spanned(
                ident,
                format!(
                    "Unknown argument `{}` for attribute `{}`",
                    x,
                    ErrorAttribute::IDENT
                ),
            )),
        }
    }
}
impl ToTokens for ErrorAttributeItem {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        match self {
            ErrorAttributeItem::Start(start) => start.to_tokens(tokens),
        }
    }
}

#[derive(Clone)]
struct StartParse {
    equals: Token![=],
    value: LitInt,
}
impl StartParse {
    fn into_start(self, ident: Ident) -> Start {
        Start { ident, parse: self }
    }
}
impl Parse for StartParse {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        Ok(Self {
            equals: input.parse()?,
            value: input.parse()?,
        })
    }
}
impl ToTokens for StartParse {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        self.equals.to_tokens(tokens);
        self.value.to_tokens(tokens);
    }
}

#[derive(Clone)]
struct Start {
    ident: Ident,
    parse: StartParse,
}
impl Start {
    const IDENT: &'static str = "start";
}
impl ToTokens for Start {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        self.ident.to_tokens(tokens);
        self.parse.to_tokens(tokens);
    }
}

#[derive(Clone)]
struct ErrorMsgAttribute {
    paren: token::Paren,
    message: ErrorMsg,
}
impl ErrorMsgAttribute {
    const IDENT: &'static str = "error_msg";
}
impl Parse for ErrorMsgAttribute {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        let content;
        let paren = parenthesized!(content in input);
        Ok(Self {
            paren,
            message: content.parse()?,
        })
    }
}
impl ToTokens for ErrorMsgAttribute {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        self.paren
            .surround(tokens, |tokens| self.message.to_tokens(tokens));
    }
}

#[derive(Clone)]
enum ErrorMsg {
    Message {
        message: LitStr,
    },
    FormatMessage {
        message: LitStr,
        comma: Token![,],
        format_args: Punctuated<Expr, Token![,]>,
    },
}
impl Parse for ErrorMsg {
    fn parse(input: ParseStream) -> syn::Result<Self> {
        let message: LitStr = input.parse()?;
        let lookahead = input.lookahead1();
        if lookahead.peek(Token![,]) {
            let comma = input.parse()?;
            let format_args = input.parse_terminated(Expr::parse)?;
            Ok(Self::FormatMessage {
                message,
                comma,
                format_args,
            })
        } else {
            Ok(Self::Message { message })
        }
    }
}
impl ToTokens for ErrorMsg {
    fn to_tokens(&self, tokens: &mut TokenStream) {
        match self {
            ErrorMsg::Message { message } => {
                message.to_tokens(tokens);
            }
            ErrorMsg::FormatMessage {
                message,
                comma,
                format_args,
            } => {
                message.to_tokens(tokens);
                comma.to_tokens(tokens);
                format_args.to_tokens(tokens);
            }
        }
    }
}
