from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

# 配置SQLite数据库
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'danmaku.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# 弹幕模型
class Danmaku(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String(200), nullable=False)
    color = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'text': self.text,
            'color': self.color,
            'created_at': self.created_at.isoformat()
        }

# 创建数据库表
with app.app_context():
    db.create_all()

@app.route('/api/danmaku', methods=['POST'])
def add_danmaku():
    data = request.json
    new_danmaku = Danmaku(
        text=data['text'],
        color=data['color']
    )
    db.session.add(new_danmaku)
    db.session.commit()
    return jsonify(new_danmaku.to_dict()), 201

@app.route('/api/danmaku', methods=['GET'])
def get_danmaku():
    # 获取最近的100条弹幕
    danmakus = Danmaku.query.order_by(Danmaku.created_at.desc()).limit(100).all()
    return jsonify([d.to_dict() for d in danmakus])

if __name__ == '__main__':
    app.run(port=5000)
