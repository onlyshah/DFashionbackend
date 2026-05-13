module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Transaction', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    userId: { type: DataTypes.UUID, allowNull: true },
    type: { type: DataTypes.ENUM('credit', 'debit'), allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    reference: { type: DataTypes.STRING(100) },
    description: { type: DataTypes.TEXT },
    balance: { type: DataTypes.DECIMAL(10, 2) },
    status: { type: DataTypes.ENUM('pending', 'completed', 'failed'), defaultValue: 'completed' }
  }, { tableName: 'transactions', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' });
};
