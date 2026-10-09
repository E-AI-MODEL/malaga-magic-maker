/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="nl" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>Je bent uitgenodigd voor {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Vakansie</Text>
        <Heading style={h1}>Je bent uitgenodigd</Heading>
        <Text style={text}>
          Je bent uitgenodigd voor{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          . Klik op de knop hieronder om de uitnodiging te accepteren en je
          account aan te maken.
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          Uitnodiging accepteren
        </Button>
        <Text style={footer}>
          Verwachtte je deze uitnodiging niet? Dan kun je deze e-mail negeren.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Barlow, Arial, sans-serif' }
const container = {
  padding: '28px 25px',
  backgroundColor: '#f4f1ea',
  borderRadius: '4px',
}
const brand = {
  fontSize: '13px',
  fontWeight: 'bold' as const,
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
  color: '#ff6a00',
  margin: '0 0 18px',
}
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#1d201f',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#4a4d4b',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const link = { color: 'inherit', textDecoration: 'underline' }
const button = {
  backgroundColor: '#ff6a00',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  borderRadius: '4px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#8a8d8b', margin: '30px 0 0' }
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #ff6a00 !important; color: #ffffff !important; }
  }
  [data-ogsc] .dm-btn { background-color: #ff6a00 !important; color: #ffffff !important; }
  [data-ogsb] .dm-btn { background-color: #ff6a00 !important; color: #ffffff !important; }
`
