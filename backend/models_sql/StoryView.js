module.exports = (sequelize, DataTypes) => {
  return sequelize.define('StoryView', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      comment: 'User who viewed the story'
    },
    storyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'story_id',
      comment: 'Viewed story'
    },
    viewedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'viewed_at',
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'story_views',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { unique: true, fields: ['user_id', 'story_id'] },
      { fields: ['story_id'] },
      { fields: ['user_id'] }
    ]
  });
};
