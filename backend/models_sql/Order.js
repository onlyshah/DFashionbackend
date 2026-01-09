module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Order', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    orderNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    customerId: { type: DataTypes.INTEGER, allowNull: false },
    items: { type: DataTypes.JSON, defaultValue: [] },
    totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'), defaultValue: 'pending' },
    paymentStatus: { type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'), defaultValue: 'pending' },
    paymentMethod: { type: DataTypes.STRING(50) },
    shippingAddress: { type: DataTypes.JSON },
    notes: { type: DataTypes.TEXT }
  }, { tableName: 'orders', timestamps: true });
};
