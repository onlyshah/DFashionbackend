module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Wishlist', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    userId: { type: DataTypes.UUID, allowNull: false },
    productId: { type: DataTypes.UUID, allowNull: false },
    addedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'wishlists', timestamps: true });
};
