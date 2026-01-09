module.exports = (sequelize, DataTypes) => {
  return sequelize.define('SearchHistory', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER },
    searchQuery: { type: DataTypes.STRING(500), allowNull: false },
    resultCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    category: { type: DataTypes.STRING(100) },
    searchedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'search_history', timestamps: true });
};
