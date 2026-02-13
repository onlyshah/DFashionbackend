module.exports = (sequelize, DataTypes) => {
  return sequelize.define('SearchSuggestion', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    keyword: { type: DataTypes.STRING(200), allowNull: false },
    frequency: { type: DataTypes.INTEGER, defaultValue: 1 },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, { tableName: 'search_suggestions', timestamps: true });
};
