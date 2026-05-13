module.exports = (sequelize, DataTypes) => {
  return sequelize.define('SearchHistory', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    userId: { type: DataTypes.UUID },
    searchQuery: { type: DataTypes.STRING(500), allowNull: false },
    category: { type: DataTypes.STRING(100) },
    searchedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'search_history', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' });
};
