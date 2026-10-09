/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="nl" dir="ltr">
    <Head />
    <Preview>Je verificatiecode</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Vakansie</Text>
        <Heading style={h1}>Bevestig je identiteit</Heading>
        <Text style={text}>Gebruik de code hieronder om je identiteit te bevestigen:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Deze code is kort geldig. Heb je dit niet aangevraagd? Dan kun je
          deze e-mail negeren.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#1d201f',
  letterSpacing: '3px',
  margin: '0 0 30px',
}
const footer = { fontSize: '12px', color: '#8a8d8b', margin: '30px 0 0' }
