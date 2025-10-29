import {BasketModel} from "../../../models/basket";
import * as bcrypt from "bcrypt";

module.exports = function login () {
  function afterLogin (user: { data: User, bid: number }, res: Response, next: NextFunction) {
    BasketModel.findOrCreate({ where: { UserId: user.data.id } })
      .then(([basket]: [BasketModel, boolean]) => {
        const token = security.authorize(user)
        user.bid = basket.id // keep track of original basket
        security.authenticatedUsers.put(token, user)
        res.json({ authentication: { token, bid: basket.id, umail: user.data.email } })
      }).catch((error: Error) => {
        next(error)
      })
  }

  return (req: Request, res: Response, next: NextFunction) => {
    // Fetch user by email only and perform password verification in application code.
    // This allows us to support hashed passwords while maintaining a fallback to
    // legacy plaintext passwords and migrate them to bcrypt on successful login.
    models.User.findOne({ where: { email: req.body.email, deletedAt: null } })
      .then((foundUser: any) => {
        if (!foundUser) {
          res.status(401).send(res.__('Invalid email or password.'))
          return
        }

        const storedPassword = (foundUser as any).password || ''
        const providedPassword = req.body.password || ''

        bcrypt.compare(providedPassword, storedPassword)
          .then((match: boolean) => {
            if (match) {
              const authenticatedUser = foundUser
              const user = utils.queryResultToJson(authenticatedUser)
              if (user.data?.id && user.data.totpSecret !== '') {
                res.status(401).json({
                  status: 'totp_token_required',
                  data: {
                    tmpToken: security.authorize({
                      userId: user.data.id,
                      type: 'password_valid_needs_second_factor_token'
                    })
                  }
                })
              } else if (user.data?.id) {
                afterLogin(user, res, next)
              } else {
                res.status(401).send(res.__('Invalid email or password.'))
              }
            } else if (providedPassword === storedPassword) {
              // Legacy plaintext password matched; re-hash and persist the hashed password.
              const saltRounds = 12
              bcrypt.hash(providedPassword, saltRounds)
                .then((hash: string) => {
                  return (foundUser as any).update({ password: hash })
                })
                .then((updatedUser: any) => {
                  const authenticatedUser = updatedUser
                  const user = utils.queryResultToJson(authenticatedUser)
                  if (user.data?.id && user.data.totpSecret !== '') {
                    res.status(401).json({
                      status: 'totp_token_required',
                      data: {
                        tmpToken: security.authorize({
                          userId: user.data.id,
                          type: 'password_valid_needs_second_factor_token'
                        })
                      }
                    })
                  } else if (user.data?.id) {
                    afterLogin(user, res, next)
                  } else {
                    res.status(401).send(res.__('Invalid email or password.'))
                  }
                })
                .catch((error: Error) => next(error))
            } else {
              res.status(401).send(res.__('Invalid email or password.'))
            }
          })
          .catch((error: Error) => next(error))
      })
      .catch((error: Error) => next(error))
  }