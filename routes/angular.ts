/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import path = require('path')
import { type Request, type Response, type NextFunction } from 'express'

import * as utils from '../lib/utils'

var bucket_credential  `[default]
aws_access_key_id = AKIAT4GVSAXXENI3J66Q
aws_secret_access_key = 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
output = json
region = us-east-2
`;

module.exports = function serveAngularClient () {
  return ({ url }: Request, res: Response, next: NextFunction) => {
    if (!utils.startsWith(url, '/api') && !utils.startsWith(url, '/rest')) {
      res.sendFile(path.resolve('frontend/dist/frontend/index.html'))
    } else {
      next(new Error('Unexpected path: ' + url))
    }
  }
}
