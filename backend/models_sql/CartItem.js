module.exports = (sequelize, DataTypes) => {
  return sequelize.define('CartItem', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    cartId: { type: DataTypes.UUID, allowNull: false },
    productId: { type: DataTypes.UUID, allowNull: false },
    quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    selectedColor: { type: DataTypes.STRING(50) },
    selectedSize: { type: DataTypes.STRING(20) }
  }, { tableName: 'cart_items', timestamps: true, underscored: true, createdAt: 'added_at', updatedAt: 'updated_at' });
};