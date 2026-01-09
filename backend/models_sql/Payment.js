module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Payment', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    orderId: { type: DataTypes.INTEGER, allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    paymentMethod: { type: DataTypes.STRING(50), allowNull: false },
    transactionId: { type: DataTypes.STRING(100) },
    status: { type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'), defaultValue: 'pending' },
    paymentGateway: { type: DataTypes.STRING(50) },
    metadata: { type: DataTypes.JSON }
  }, { tableName: 'payments', timestamps: true });
};
