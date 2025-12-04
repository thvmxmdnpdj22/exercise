// src/pages/UserSelect.jsx
import React, { useEffect, useState } from "react";
import "./Dashboard.css";
import Sidebar from "../components/sidebar.jsx";

const mockUsers = [
  {
    id: 1,
    name: "김민지",
    level: "초급자",
    sessions: 23,
    accuracy: 89.2,
    totalHours: 12,
    lastExercise: "1일 전",
  },
  {
    id: 2,
    name: "박준호",
    level: "중급자",
    sessions: 47,
    accuracy: 92.1,
    totalHours: 28,
    lastExercise: "2일 전",
  },
  {
    id: 3,
    name: "이수정",
    level: "중급자",
    sessions: 78,
    accuracy: 95.7,
    totalHours: 45,
    lastExercise: "오늘",
  },
  {
    id: 4,
    name: "최동현",
    level: "초급자",
    sessions: 12,
    accuracy: 84.3,
    totalHours: 8,
    lastExercise: "5일 전",
  },
  {
    id: 5,
    name: "정유진",
    level: "중급자",
    sessions: 35,
    accuracy: 90.8,
    totalHours: 22,
    lastExercise: "3일 전",
  },
  {
    id: 6,
    name: "윤성민",
    level: "고급자",
    sessions: 62,
    accuracy: 93.4,
    totalHours: 38,
    lastExercise: "1일 전",
  },
  {
    id: 7,
    name: "한소영",
    level: "초급자",
    sessions: 8,
    accuracy: 81.7,
    totalHours: 5,
    lastExercise: "7일 전",
  },
];

const UserCard = ({ user, isSelected, onStart }) => {
  return (
    <div className={`card user-card ${isSelected ? "user-card-selected" : ""}`}>
      <div className="user-card-top">
        <div className="avatar-wrapper">
          <div className="avatar-circle">{user.name.charAt(0)}</div>
          {isSelected && <div className="avatar-check">✓</div>}
        </div>
        <div className="user-main">
          <div className="user-name">{user.name}</div>
          <div className="user-level">{user.level}</div>
        </div>
      </div>

      <div className="user-stats-row">
        <div className="user-stat-block">
          <div className="user-stat-label">총 세션</div>
          <div className="user-stat-value">{user.sessions}</div>
          <div className="user-stat-sub">{user.totalHours}h 운동시간</div>
        </div>
        <div className="user-stat-block">
          <div className="user-stat-label">운동 정확도</div>
          <div className="user-stat-value user-stat-highlight">
            {user.accuracy.toFixed(1)}%
          </div>
          <div className="user-stat-sub">{user.lastExercise} 마지막 운동</div>
        </div>
      </div>

      <div className="user-card-actions">
        <button
          className="primary-pill-button"
          onClick={() => onStart(user.id)}  // ⬅ 여기서 시작 핸들러 호출
        >
          ▶ 운동 시작
        </button>
        <button className="ghost-button">상세 보기</button>
      </div>
    </div>
  );
};

const AddUserCard = ({ onClick }) => (
  <div className="card add-user-card" onClick={onClick}>
    <div className="add-user-plus">+</div>
    <div className="add-user-title">새 사용자 추가</div>
    <div className="add-user-desc">
      새로운 사용자를 등록하여 운동을 시작해보세요
    </div>
  </div>
);

const UserSelect = ({ currentPage, onChangePage, onStartExercise }) => {
  const [users, setUsers] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);

  useEffect(() => {
    // 나중에 API 호출로 교체
    setUsers(mockUsers);
    if (mockUsers.length > 0) {
      setSelectedUserId(mockUsers[0].id);
    }
  }, []);

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  const goRegister = () => {
    onChangePage && onChangePage("userRegister");
  };

  const handleStart = (userId) => {
    setSelectedUserId(userId);               // 목록에서 선택 표시
    if (onStartExercise) onStartExercise(userId); // App에 알려서 page="select"로
  };

  return (
    <div className="dashboard">
      <Sidebar currentPage={currentPage} onChangePage={onChangePage} />

      <main className="main">
        {/* 상단 헤더 */}
        <header className="header">
          <div>
            <h1 className="page-title">사용자 선택</h1>
            <p className="page-subtitle">
              운동을 시작할 사용자를 선택하세요
            </p>
          </div>

          <div className="user-header-right">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="사용자 검색..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
            </div>
            <button
              className="green-button"
              type="button"
              onClick={goRegister}
            >
              + 새 사용자 추가
            </button>
          </div>
        </header>

        {/* 필터 / 정렬 툴바 */}
        <section className="user-toolbar">
          <div className="toolbar-left">
            <select className="filter-select">
              <option>모든 레벨</option>
              <option>초급자</option>
              <option>중급자</option>
              <option>고급자</option>
            </select>
            <select className="filter-select">
              <option>최근 활동순</option>
              <option>이름순</option>
              <option>정확도 높은 순</option>
            </select>
            <div className="toolbar-count">
              총 <strong>{users.length}</strong>명
            </div>
          </div>

          <div className="toolbar-right">
            <button className="view-toggle active">▦</button>
            <button className="view-toggle">☰</button>
          </div>
        </section>

        {/* 사용자 카드 그리드 */}
        <section className="user-grid">
          {filteredUsers.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              isSelected={user.id === selectedUserId}
              onStart={handleStart}
            />
          ))}
          <AddUserCard onClick={goRegister} />
        </section>

        {/* 하단 정보 + 페이지네이션 (더미) */}
        <div className="user-footer">
          <div className="user-footer-text">
            {filteredUsers.length}명 중 1–{filteredUsers.length}명 표시
          </div>
          <div className="pagination">
            <button className="page-button">&lt;</button>
            <button className="page-button active">1</button>
            <button className="page-button">2</button>
            <button className="page-button">3</button>
            <button className="page-button">&gt;</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserSelect;
