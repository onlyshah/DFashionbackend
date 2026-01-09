module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Return', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    orderId: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    reason: { type: DataTypes.TEXT },
    status: { type: DataTypes.ENUM('pending', 'approved', 'rejected', 'completed'), defaultValue: 'pending' },
    refundAmount: { type: DataTypes.DECIMAL(10, 2) },
    items: { type: DataTypes.JSON, defaultValue: [] }
  }, { tableName: 'returns', timestamps: true });
};
