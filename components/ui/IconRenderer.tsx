import React from "react";
import {
  FaBook, FaBookOpen, FaBookReader, FaBookmark, FaRegBookmark, FaLayerGroup, FaTags, FaList,
  FaGraduationCap, FaUniversity, FaSchool, FaChalkboardTeacher, FaPen, FaPenFancy, FaPencilAlt,
  FaFileAlt, FaFilePdf, FaFileWord, FaFolder, FaFolderOpen, FaArchive, FaAtlas,
  FaMosque, FaQuran, FaPray, FaHands, FaStarAndCrescent, FaKaaba, FaBalanceScale, FaGavel,
  FaQuoteRight, FaQuoteLeft,
  FaGlobe, FaHistory, FaMicroscope, FaFlask, FaBrain, FaLightbulb, FaRegLightbulb,
  FaCode, FaTerminal, FaDesktop, FaLaptop, FaMobileAlt, FaDatabase, FaServer, FaCloud,
  FaMicrophone, FaPodcast, FaVideo, FaCamera, FaImage, FaImages, FaMusic, FaPlayCircle,
  FaUser, FaUsers, FaUserGraduate, FaUserTie, FaIdCard, FaAddressCard, FaBriefcase,
  FaChartLine, FaChartBar, FaChartPie, FaMoneyBillWave, FaCoins, FaWallet,
  FaLeaf, FaTree, FaSeedling, FaSun, FaMoon, FaStar, FaRegStar, FaHeart, FaRegHeart,
  FaFire, FaWater, FaWind, FaBolt, FaUmbrella, FaCrown, FaMedal, FaTrophy, FaAward,
  FaMap, FaMapMarkedAlt, FaCompass, FaLandmark, FaBuilding, FaHome, FaPlane, FaCar,
  FaInfoCircle, FaQuestionCircle, FaExclamationCircle, FaCheckCircle, FaTimesCircle,
  FaSearch, FaCog, FaCogs, FaWrench, FaTools, FaShieldAlt, FaLock, FaUnlock, FaKey,
  FaEnvelope, FaPaperPlane, FaComments, FaBug, FaClock, FaCalendarAlt, FaThumbsUp
} from "react-icons/fa";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FaBook, FaBookOpen, FaBookReader, FaBookmark, FaRegBookmark, FaLayerGroup, FaTags, FaList,
  FaGraduationCap, FaUniversity, FaSchool, FaChalkboardTeacher, FaPen, FaPenFancy, FaPencilAlt,
  FaFileAlt, FaFilePdf, FaFileWord, FaFolder, FaFolderOpen, FaArchive, FaAtlas,
  FaMosque, FaQuran, FaPray, FaHands, FaStarAndCrescent, FaKaaba, FaBalanceScale, FaGavel,
  FaQuoteRight, FaQuoteLeft,
  FaGlobe, FaHistory, FaMicroscope, FaFlask, FaBrain, FaLightbulb, FaRegLightbulb,
  FaCode, FaTerminal, FaDesktop, FaLaptop, FaMobileAlt, FaDatabase, FaServer, FaCloud,
  FaMicrophone, FaPodcast, FaVideo, FaCamera, FaImage, FaImages, FaMusic, FaPlayCircle,
  FaUser, FaUsers, FaUserGraduate, FaUserTie, FaIdCard, FaAddressCard, FaBriefcase,
  FaChartLine, FaChartBar, FaChartPie, FaMoneyBillWave, FaCoins, FaWallet,
  FaLeaf, FaTree, FaSeedling, FaSun, FaMoon, FaStar, FaRegStar, FaHeart, FaRegHeart,
  FaFire, FaWater, FaWind, FaBolt, FaUmbrella, FaCrown, FaMedal, FaTrophy, FaAward,
  FaMap, FaMapMarkedAlt, FaCompass, FaLandmark, FaBuilding, FaHome, FaPlane, FaCar,
  FaInfoCircle, FaQuestionCircle, FaExclamationCircle, FaCheckCircle, FaTimesCircle,
  FaSearch, FaCog, FaCogs, FaWrench, FaTools, FaShieldAlt, FaLock, FaUnlock, FaKey,
  FaEnvelope, FaPaperPlane, FaComments, FaBug, FaClock, FaCalendarAlt, FaThumbsUp
};

interface IconRendererProps {
  name?: string;
  className?: string;
}

export default function IconRenderer({ name, className = "w-5 h-5" }: IconRendererProps) {
  if (!name || !iconMap[name]) {
    return <FaBook className={className} />;
  }
  const IconComponent = iconMap[name];
  return <IconComponent className={className} />;
}

