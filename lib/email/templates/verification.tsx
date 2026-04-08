import * as React from 'react';
import { Html, Head, Preview, Body, Container, Section, Text, Heading, Button } from '@react-email/components';

interface VerificationEmailProps {
  name: string;
  verificationLink: string;
}

export default function VerificationEmail({ name, verificationLink }: VerificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Verify your email address for Smart Expense Splitter</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome, {name}!</Heading>
          <Text style={text}>
            Thanks for signing up for Smart Expense Splitter. Please verify your email address to get started.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={verificationLink}>
              Verify Email Address
            </Button>
          </Section>
          <Text style={text}>
            Or copy and paste this URL into your browser: <br />
            {verificationLink}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  width: '580px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '1.25',
  marginBottom: '24px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '24px',
};

const buttonContainer = {
  padding: '24px 0',
};

const button = {
  backgroundColor: '#000',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '12px',
};
