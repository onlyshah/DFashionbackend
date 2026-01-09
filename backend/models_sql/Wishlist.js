module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Wishlist', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    productId: { type: DataTypes.INTEGER, allowNull: false },
    addedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'wishlists', timestamps: true });
};
