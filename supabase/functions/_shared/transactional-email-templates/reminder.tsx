import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface ReminderProps {
  title?: string
  body?: string
  url?: string
}

const ReminderEmail = ({ title, body, url }: ReminderProps) => (
  <Html lang="nl" dir="ltr">
    <Head />
    <Preview>{title || 'Herinnering voor je reis'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Vakansie</Text>
        <Heading style={h1}>{title || 'Herinnering voor je reis'}</Heading>
        <Text style={text}>{body || 'Er staat iets voor je klaar in je reis.'}</Text>
        <Button style={button} href={url || 'https://vakansie.app/trips'}>Bekijk in Vakansie</Button>
        <Text style={footer}>Je krijgt dit bericht omdat herinneringen per e-mail aan staan. Je zet ze uit in Profiel onder Meldingen.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ReminderEmail,
  subject: (data: Record<string, unknown>) => (typeof data.title === 'string' && data.title ? data.title : 'Herinnering voor je reis'),
  displayName: 'Herinnering',
  previewData: { title: 'Morgen vertrek je', body: 'Zomer in Italië begint morgen.', url: 'https://vakansie.app/trips' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Barlow, Arial, sans-serif' }
const container = { padding: '28px 25px', backgroundColor: '#f4f1ea', borderRadius: '4px' }
const brand = { fontSize: '13px', fontWeight: 'bold' as const, letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#ff6a00', margin: '0 0 18px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1d201f', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#4a4d4b', lineHeight: '1.5', margin: '0 0 25px' }
const button = { backgroundColor: '#ff6a00', color: '#ffffff', fontSize: '14px', fontWeight: 'bold' as const, borderRadius: '4px', padding: '12px 20px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#8a8d8b', margin: '30px 0 0' }
