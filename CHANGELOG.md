# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Mobile sidebar navigation với hamburger menu button
- Student review feature với review window (10/20/30/60 phút)
- Session name customization khi tạo session
- Class join confirmation modal
- Student lobby với explicit join button
- Question scores caching trong Attempt model (JSONB)
- Link từ dashboard header "BKquiz" về landing page
- Real-time student count updates trong teacher screen (polling 3s)
- Auto-start/auto-end session với buffer time
- Server-side time validation cho review access và time limits

### Changed
- Student review logic: từ "delay after end" sang "review window"
- Session status API: thêm `sessionName` và `attemptId` fields
- Attempt API: thêm `sessionName` trong state response
- Mobile sidebar: auto-close khi route thay đổi
- Session creation modal: rộng hơn, quiz list luôn enable

### Fixed
- Fix infinite loop trong mobile sidebar useEffect
- Fix session creation không tạo questions theo quiz rules
- Fix student không thể enter token trong checkpoint
- Fix "Đã trả lời" count không update real-time
- Fix indentation errors trong QuestionBankPanel
- Fix operator precedence error trong teacherScreen.tsx

### Security
- Server-side time validation cho tất cả time-based checks
- Review window access control với server-side enforcement

---

## [0.1.0] - 2025-01-XX

### Added
- Initial release
- Classroom management (create, join, members)
- Question Bank với import/export Markdown
- Quiz creation với same-set và variant-set modes
- Session runtime với TOTP token verification
- Student attempt với checkpoint system
- Teacher screen với QR code và token display
- Auto-save answers với offline support
- Scoring system với multiple methods
- Authentication với Google OAuth
- Internationalization (i18n) support
- LaTeX math rendering
- Dark theme UI

### Documentation
- Architecture documentation
- API documentation
- Database schema documentation
- User flows documentation
- UI/UX guidelines
- Security documentation

---

## Types of Changes

- **Added** - New features
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security fixes
