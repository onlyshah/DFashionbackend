module.exports = (sequelize, DataTypes) => {
  return sequelize.define('SearchSuggestion', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    keyword: { type: DataTypes.STRING(200), allowNull: false, unique: true },
    frequency: { type: DataTypes.INTEGER, defaultValue: 1 },
    category: { type: DataTypes.STRING(100) },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, { tableName: 'search_suggestions', timestamps: true });
};
