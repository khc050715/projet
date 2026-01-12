// next.config.mjs

/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

// ★ 중요: 여기에 깃허브 리포지토리 이름을 적으세요 (예: 'projet')
const repoName = 'projet'; 

const nextConfig = {
  reactStrictMode: true,
  // 1. 정적 사이트로 출력 (HTML/CSS/JS)
  output: 'export',
  
  // 2. 깃허브 페이지 경로 문제 해결 (배포 시에만 repoName을 경로에 붙임)
  basePath: isProd ? `/${repoName}` : '',
  
  // 3. 정적 모드에서는 이미지 최적화 기능 사용 불가 (필수 설정)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;