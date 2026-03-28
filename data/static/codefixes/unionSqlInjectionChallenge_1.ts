module.exports = function searchProducts () {
  return (req: Request, res: Response, next: NextFunction) => {
    let criteria: any = req.query.q === 'undefined' ? '' : req.query.q ?? ''
    criteria = String(criteria).substring(0, 200)
    criteria = criteria.replace(/"|'|;|\b(and|or)\b/gi, "")
    const like = `%${criteria}%`
    models.sequelize.query(
      'SELECT id, name, description FROM Products WHERE ((name LIKE :like OR description LIKE :like) AND deletedAt IS NULL) ORDER BY name',
      { replacements: { like }, type: models.sequelize.QueryTypes.SELECT }
    )
      .then(([products]: any) => {
        const dataString = JSON.stringify(products)
        for (let i = 0; i < products.length; i++) {
          products[i].name = req.__(products[i].name)
          products[i].description = req.__(products[i].description)
        }
        res.json(utils.queryResultToJson(products))
      }).catch((error: ErrorWithParent) => {
        next(error.parent)
      })
  }
}