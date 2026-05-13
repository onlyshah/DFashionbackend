-- Create Product Reviews Table
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  review_text TEXT,
  verified_purchase BOOLEAN DEFAULT FALSE,
  helpful_count INTEGER DEFAULT 0,
  unhelpful_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON product_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_product_reviews_status ON product_reviews(status);
CREATE INDEX IF NOT EXISTS idx_product_reviews_created_at ON product_reviews(created_at);

-- Create Creator Ratings Table
CREATE TABLE IF NOT EXISTS creator_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  overall_rating DECIMAL(3,2) CHECK (overall_rating >= 1 AND overall_rating <= 5),
  content_quality DECIMAL(3,2),
  engagement DECIMAL(3,2),
  professionalism DECIMAL(3,2),
  comment TEXT,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_creator_ratings_creator_id ON creator_ratings(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_ratings_rater_id ON creator_ratings(rater_id);
CREATE INDEX IF NOT EXISTS idx_creator_ratings_rating ON creator_ratings(overall_rating);
CREATE INDEX IF NOT EXISTS idx_creator_ratings_created_at ON creator_ratings(created_at);

-- Create Review Disputes Table
CREATE TABLE IF NOT EXISTS review_disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
  disputer_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  dispute_reason VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'closed')),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_review_disputes_review_id ON review_disputes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_disputes_status ON review_disputes(status);
CREATE INDEX IF NOT EXISTS idx_review_disputes_created_at ON review_disputes(created_at);

-- Create Reported Reviews Table
CREATE TABLE IF NOT EXISTS reported_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  report_reason VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'action_taken', 'dismissed')),
  action_taken VARCHAR(255),
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reported_reviews_review_id ON reported_reviews(review_id);
CREATE INDEX IF NOT EXISTS idx_reported_reviews_status ON reported_reviews(status);
CREATE INDEX IF NOT EXISTS idx_reported_reviews_created_at ON reported_reviews(created_at);
