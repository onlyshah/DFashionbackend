module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },

    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },

    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: { isEmail: true }
    },

    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'password_hash'
    },

    firstName: DataTypes.STRING(100),
    lastName: DataTypes.STRING(100),

    fullName: {
      type: DataTypes.STRING(150),
      get() {
        return `${this.firstName || ''} ${this.lastName || ''}`.trim();
      }
    },

    avatarUrl: {
      type: DataTypes.STRING(255),
      field: 'avatar_url'
    },

    bio: DataTypes.STRING(255),

    roleId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'role_id'
    },

    role: DataTypes.STRING(50),

    departmentId: {
      type: DataTypes.UUID,
      field: 'department_id'
    },

    department: DataTypes.STRING(50),

    phone: DataTypes.STRING(20),
    address: DataTypes.TEXT,
    city: DataTypes.STRING(100),
    state: DataTypes.STRING(100),
    zipCode: DataTypes.STRING(20),

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },

    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_email_verified'
    },

    emailVerificationToken: {
      type: DataTypes.STRING(255),
      field: 'email_verification_token'
    },

    emailVerifiedAt: {
      type: DataTypes.DATE,
      field: 'email_verified_at'
    },

    twoFactorEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'two_factor_enabled'
    },

    twoFactorSecret: {
      type: DataTypes.STRING(255),
      field: 'two_factor_secret'
    },

    loginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'login_attempts'
    },

    accountLockedUntil: {
      type: DataTypes.DATE,
      field: 'account_locked_until'
    },

    resetPasswordToken: DataTypes.STRING(255),
    resetPasswordExpiry: DataTypes.DATE,

    lastLogin: {
      type: DataTypes.DATE,
      field: 'last_login_at'
    },

    lastActivity: {
      type: DataTypes.DATE,
      field: 'last_activity_at'
    },

    deletedAt: {
      type: DataTypes.DATE,
      field: 'deleted_at'
    }

  }, {
    tableName: 'users',
    timestamps: true,
    paranoid: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at'
  });

  return User;
};
