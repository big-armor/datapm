# Updating the SSL Certificate

- Visit ssl.com and purchase a renewal of the signing certificate
- After the certificate is approved, download the certificate and the private key - should be a p12 file format
  - The link is small and at the top right "Generate Certificate"
- Base64 encode the file
 - openssl base64 -in <filename>.p12 -out <filename>.p12.base64
- Copy the contents into the WINDOWS_CLIENT_CERTIFICATE_BASE64 in github secrets
- Copy the password into the WINDOWS_CLIENT_CERTIFICATE_PASSWORD in github secrets


