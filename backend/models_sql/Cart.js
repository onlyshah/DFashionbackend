module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Cart', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    userId: { type: DataTypes.UUID, allowNull: false },
    productId: { type: DataTypes.UUID, allowNull: true },  // Changed to nullable - items stored in cart_items
    quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
    price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 }
  }, { tableName: 'carts', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' });
};
