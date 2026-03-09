## Valio Support Customer-facing website – part of our Junction 2025 project

Our project had to help Valio Aimo in their shipping logistics. Particurlarly predicting outages, and reaching out if a product wouldn't make a shipment. Our project uses a custom ML-model for predicting product shortages and an ElevenLabs-powered helpline for automatically calling the customer if something they ordered would be missing. The agent would then arrange a replacement item, and update the product database. The same number could also be called to report missing items, and this website is part of that. There also is an admin panel website for overseeing the product database and seeing activity like recent calls and summaries of them. This was all powered by n8n, and as well as making this website I was working on the backend and most of the ElevenLabs integration.

This website acts as a verification layer, before the helpline number is revealed. The customer submits a photo of their shipment which is sent to an OpenAI-vision model and it returns how confident it is that the photo has a shipment that's missing items. If it's confident, it reveals the helpline number to request replacements.

Our project ended up **finishing 5th** in the Valio Aimo Challenge, not bad considering most of our team were first-timers!

### **Check out the other repos!**

[Prediction ML Model,](https://github.com/OtsoBear/Junction2025) [Admin panel](https://github.com/adiiexe/valio-admin)
