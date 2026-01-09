module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Ticket', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    ticketNumber: { type: DataTypes.STRING(50), unique: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    subject: { type: DataTypes.STRING(300), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    category: { type: DataTypes.STRING(100) },
    priority: { type: DataTypes.ENUM('low', 'medium', 'high', 'critical'), defaultValue: 'medium' },
    status: { type: DataTypes.ENUM('open', 'in_progress', 'waiting', 'resolved', 'closed'), defaultValue: 'open' },
    assignedTo: { type: DataTypes.INTEGER },
    resolvedAt: { type: DataTypes.DATE }
  }, { tableName: 'tickets', timestamps: true });
};
