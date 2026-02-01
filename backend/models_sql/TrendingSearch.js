module.exports = (sequelize, DataTypes) => {
  return sequelize.define('TrendingSearch', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    // allow alternate field 'searchQuery' used by seeders
    keyword: { type: DataTypes.STRING(200), allowNull: true },
    searchQuery: { type: DataTypes.STRING(200), allowNull: true },
    searchCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    rank: { type: DataTypes.INTEGER },
    category: { type: DataTypes.STRING(100) },
    trendingAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'trending_searches', timestamps: true });
};
