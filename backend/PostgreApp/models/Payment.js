module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Payment', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    orderId: { type: DataTypes.UUID, allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    paymentMethod: { type: DataTypes.STRING(50), allowNull: false },
    transactionId: { type: DataTypes.STRING(100) },
    status: { type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'), defaultValue: 'pending' },
    paymentGateway: { type: DataTypes.STRING(50) },
    metadata: { type: DataTypes.JSON }
  }, { tableName: 'payments', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' });
};
