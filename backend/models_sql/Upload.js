module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Upload', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    fileName: { type: DataTypes.STRING(255), allowNull: false },
    fileSize: { type: DataTypes.BIGINT, defaultValue: 0 },
    fileType: { type: DataTypes.STRING(100) },
    uploadPath: { type: DataTypes.STRING(500) },
    uploadStatus: { type: DataTypes.ENUM('pending', 'in-progress', 'completed', 'failed'), defaultValue: 'pending' },
    uploadedAt: { type: DataTypes.DATE },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, { tableName: 'uploads', timestamps: true, underscored: true, createdAt: 'created_at', updatedAt: 'updated_at' });
};
