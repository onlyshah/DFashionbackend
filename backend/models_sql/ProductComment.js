module.exports = (sequelize, DataTypes) => {
  return sequelize.define('ProductComment', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    productId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: true },
    comment: { type: DataTypes.TEXT, allowNull: false }
  }, { tableName: 'product_comments', timestamps: true });
};
