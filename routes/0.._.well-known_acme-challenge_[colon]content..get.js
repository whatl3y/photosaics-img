const letsEncryptReponse = process.env.CERTBOT_RESPONSE
module.exports = function(req,res) {
  res.send(letsEncryptReponse)
}
