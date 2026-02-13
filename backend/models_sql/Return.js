module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Return', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    orderId: { type: DataTypes.UUID, allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: true },
    reason: { type: DataTypes.TEXT },
    status: { type: DataTypes.ENUM('pending', 'approved', 'rejected', 'completed'), defaultValue: 'pending' },
    refundAmount: { type: DataTypes.DECIMAL(10, 2) },
    items: { type: DataTypes.JSON, defaultValue: [] }
  }, { tableName: 'returns', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' });
};
