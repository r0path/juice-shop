/*
 * Copyright (c) 2014-2024 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import path = require('path')
import { type Request, type Response, type NextFunction } from 'express'

module.exports = function serveQuarantineFiles () {
  return ({ params, query }: Request, res: Response, next: NextFunction) => {
    const file = params.file
    const resolvedPath = path.resolve('ftp/quarantine/', file)
    const expectedDir = path.resolve('ftp/quarantine/')
    if (!resolvedPath.startsWith(expectedDir + path.sep) || path.basename(resolvedPath) !== file) {
      res.status(403)
      next(new Error('Invalid file name!'))
    } else {
      res.sendFile(resolvedPath)
    }
  }
}
