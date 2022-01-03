## 1wallet QR Parser

1wallet: https://github.com/polymorpher/one-wallet

This 1wallet tool helps you convert (multiple) bundled QR code exported from Google Authenticator, to individual QR code that can be uploaded to 1wallet Restore page. Accounts unrelated to 1wallet are automatically ignored.

### Usage

After installing dependencies (`yarn install`)

1. Drop one or more QR code files into `inputs` folder.
2. Run `yarn run start` in the root folder
3. Copy files in your `outputs` folder to a secure location
4. <b>IMPORTANT</b>: Delete your files in `inputs` folder
5. <b>IMPORTANT</b>: After your 1wallets are restored, delete the QR code files you copied out in step 3.

If hackers gain access to your QR code files, they may gain control of your 1wallet. It is very important that you delete these files properly (and empty your recycle bin!) 
