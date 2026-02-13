module.exports = (sequelize, DataTypes) => {
  return sequelize.define('FAQ', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    question: { type: DataTypes.TEXT, allowNull: false },
    answer: { type: DataTypes.TEXT, allowNull: false },
    category: { type: DataTypes.STRING(100) },
    order: { type: DataTypes.INTEGER, defaultValue: 0 },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, { tableName: 'faqs', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' });
};
