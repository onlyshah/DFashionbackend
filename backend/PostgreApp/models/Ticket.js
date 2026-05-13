module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Ticket', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    ticketNumber: { type: DataTypes.STRING(50), unique: true },
    userId: { type: DataTypes.UUID, allowNull: false },
    subject: { type: DataTypes.STRING(300), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    category: { type: DataTypes.STRING(100) },
    priority: { type: DataTypes.ENUM('low', 'medium', 'high', 'critical'), defaultValue: 'medium' },
    status: { type: DataTypes.ENUM('open', 'in_progress', 'waiting', 'resolved', 'closed'), defaultValue: 'open' },
    resolvedAt: { type: DataTypes.DATE }
  }, { tableName: 'tickets', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' });
};
