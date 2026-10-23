import React, { useState } from 'react';
import Modal from 'react-modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle, faExclamationTriangle, faTimesCircle,
  faChevronDown, faChevronUp, faClock, faCalendarAlt, faPlay,
} from '@fortawesome/free-solid-svg-icons';
import modalStyles from '@/styles/modalStyles';
import { repairEpg } from '@/api/epg';
import CustomLoader from '@/components/commons/CustomLoader';

interface EPGProgram {
  id: string;
  subtitle: string | null;
  thumbnail: string | null;
  alternateThumbnail: string | null;
  catchup: boolean;
  rating: string | null;
  archive: boolean;
  description: string | null;
  duration: string;
  end_time: string;
  ext_id: string;
  slug: string | null;
  start_time: string;
  title: string;
}

interface EPGValidationResult {
  epgId: string
  isValid: boolean;
  errors: string[];
  warnings: string[];
  totalPrograms: number;
  sortedPrograms: EPGProgram[];
  timeGaps: any[];
  timeOverlaps: any[];
}

interface EPGValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  validationResult: EPGValidationResult | null;
}

export default function EPGValidationModal({
  isOpen,
  onClose,
  validationResult,
}: EPGValidationModalProps) {
  const [expandedSections, setExpandedSections] = useState<{
    errors: boolean;
    warnings: boolean;
    timeIssues: boolean;
    programs: boolean;
  }>({
    errors: true,
    warnings: true,
    timeIssues: true,
    programs: false,
  });
  const [loading, setLoading] = useState<boolean>(false);

  if (!validationResult) return null;

  const onRepair = async () => {
    if (validationResult.epgId) {
      try {
        setLoading(true);
        const response = await repairEpg(validationResult.epgId);
        if (response.data.status === 200) {
          setLoading(false);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error while validating EPG');
      } finally {
        setLoading(false);
      }
    } else {
      console.error('The EPG must be saved before triggering the validation.');
    }
  };
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const getStatusColor = () => {
    if (validationResult.isValid) {
      return 'bg-green';
    }
    if (validationResult.errors.length > 0) {
      return 'bg-red';
    }
    return 'bg-yellow-700';
  };

  const getStatusIcon = () => {
    if (validationResult.isValid) {
      return faCheckCircle;
    }
    if (validationResult.errors.length > 0) {
      return faTimesCircle;
    }
    return faExclamationTriangle;
  };

  const getStatusText = () => {
    if (validationResult.isValid) {
      return 'All Good!';
    }
    if (validationResult.errors.length > 0) {
      return 'Issues Found';
    }
    return 'Warnings Found';
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      style={{
        ...modalStyles,
        content: {
          ...modalStyles.content,
          maxWidth: '95%',
          maxHeight: '95%',
          width: '1200px',
          padding: '0',
          borderRadius: '12px',
          border: 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      }}
      ariaHideApp={false}
    >
      <div className="bg-gray text-white rounded-lg overflow-hidden flex flex-col h-full">
        {/* Fixed Header - Always Visible */}
        <div className={`${getStatusColor()} text-white p-6 flex-shrink-0`}>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <FontAwesomeIcon icon={getStatusIcon()} className="text-3xl" />
              <div>
                <h2 className="text-2xl font-bold">{getStatusText()}</h2>
                <p className="text-white/90 mt-1">
                  EPG Validation Results •
                  {' '}
                  {validationResult.totalPrograms}
                  {' '}
                  Programs
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl transition-colors"
              type="button"
            >
              ×
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-dark border border-gray-light rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 text-xl" />
                  <div>
                    <p className="text-sm text-gray-300 font-medium">Total Programs</p>
                    <p className="text-2xl font-bold text-white">{validationResult.totalPrograms}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-dark border border-gray-light rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <FontAwesomeIcon icon={faTimesCircle} className="text-red-500 text-xl" />
                  <div>
                    <p className="text-sm text-gray-300 font-medium">Errors</p>
                    <p className="text-2xl font-bold text-white">{validationResult.errors.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-dark border border-gray-light rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-500 text-xl" />
                  <div>
                    <p className="text-sm text-gray-300 font-medium">Warnings</p>
                    <p className="text-2xl font-bold text-white">{validationResult.warnings.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-dark border border-gray-light rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <FontAwesomeIcon icon={faClock} className="text-blue-500 text-xl" />
                  <div>
                    <p className="text-sm text-gray-300 font-medium">Time Issues</p>
                    <p className="text-2xl font-bold text-white">
                      {validationResult.timeGaps.length + validationResult.timeOverlaps.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Collapsible Sections */}
            <div className="space-y-4">
              {/* Errors Section */}
              {validationResult.errors.length > 0 && (
                <div className="border border-red-500 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('errors')}
                    className="w-full bg-red-500/20 hover:bg-red-500/30 p-4 flex justify-between items-center transition-colors"
                    type="button"
                  >
                    <div className="flex items-center gap-3">
                      <FontAwesomeIcon icon={faTimesCircle} className="text-red-400" />
                      <span className="font-semibold text-red-300">
                        Errors (
                        {validationResult.errors.length}
                        )
                      </span>
                    </div>
                    <FontAwesomeIcon
                      icon={expandedSections.errors ? faChevronUp : faChevronDown}
                      className="text-red-400"
                    />
                  </button>
                  {expandedSections.errors && (
                    <div className="p-4 bg-gray-dark">
                      <ul className="space-y-2">
                        {validationResult.errors.map((error, index) => (
                          // eslint-disable-next-line react/no-array-index-key
                          <li key={`error-${index}`} className="flex items-start gap-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                            <FontAwesomeIcon icon={faTimesCircle} className="text-red-400 mt-1 flex-shrink-0" />
                            <span className="text-red-300">{error}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Warnings Section */}
              {validationResult.warnings.length > 0 && (
                <div className="border border-yellow-500 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('warnings')}
                    className="w-full bg-yellow-500/20 hover:bg-yellow-500/30 p-4 flex justify-between items-center transition-colors"
                    type="button"
                  >
                    <div className="flex items-center gap-3">
                      <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-400" />
                      <span className="font-semibold text-yellow-300">
                        Warnings (
                        {validationResult.warnings.length}
                        )
                      </span>
                    </div>
                    <FontAwesomeIcon
                      icon={expandedSections.warnings ? faChevronUp : faChevronDown}
                      className="text-yellow-400"
                    />
                  </button>
                  {expandedSections.warnings && (
                    <div className="p-4 bg-gray-dark">
                      <ul className="space-y-2">
                        {validationResult.warnings.map((warning, index) => (
                        // eslint-disable-next-line react/no-array-index-key
                          <li key={`warning-${index}`} className="flex items-start gap-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-400 mt-1 flex-shrink-0" />
                            <span className="text-yellow-300">{warning}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Time Issues Section */}
              {(validationResult.timeGaps.length > 0 || validationResult.timeOverlaps.length > 0)
              && (
                <div className="border border-blue-500 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleSection('timeIssues')}
                    className="w-full bg-blue-500/20 hover:bg-blue-500/30 p-4 flex justify-between items-center transition-colors"
                    type="button"
                  >
                    <div className="flex items-center gap-3">
                      <FontAwesomeIcon icon={faClock} className="text-blue-400" />
                      <span className="font-semibold text-blue-300">
                        Time Issues (
                        {validationResult.timeGaps.length + validationResult.timeOverlaps.length}
                        )
                      </span>
                    </div>
                    <FontAwesomeIcon
                      icon={expandedSections.timeIssues ? faChevronUp : faChevronDown}
                      className="text-blue-400"
                    />
                  </button>
                  {expandedSections.timeIssues && (
                    <div className="p-4 bg-gray-dark space-y-4">
                      {validationResult.timeGaps.length > 0 && (
                        <div>
                          <h5 className="font-semibold text-blue-300 mb-2 flex items-center gap-2">
                            <FontAwesomeIcon icon={faCalendarAlt} />
                            Time Gaps (
                            {validationResult.timeGaps.length}
                            )
                          </h5>
                          <div className="space-y-2">
                            {validationResult.timeGaps.map((gap, index) => (
                            // eslint-disable-next-line react/no-array-index-key
                              <div key={`gap-${index}`} className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                <pre className="text-blue-300 text-sm">{JSON.stringify(gap, null, 2)}</pre>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {validationResult.timeOverlaps.length > 0 && (
                        <div>
                          <h5 className="font-semibold text-blue-300 mb-2 flex items-center gap-2">
                            <FontAwesomeIcon icon={faPlay} />
                            Time Overlaps (
                            {validationResult.timeOverlaps.length}
                            )
                          </h5>
                          <div className="space-y-2">
                            {validationResult.timeOverlaps.map((overlap, index) => (
                            // eslint-disable-next-line react/no-array-index-key
                              <div key={`overlap-${index}`} className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                <pre className="text-blue-300 text-sm">{JSON.stringify(overlap, null, 2)}</pre>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-light">
              {!validationResult.isValid && (
                <button
                  onClick={onRepair}
                  className="px-6 py-3 bg-green hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                  type="button"
                >
                  {loading ? (
                    <CustomLoader size={20} contained={false} />
                  ) : (
                    <p>Repair</p>
                  )}

                </button>
              )}
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-light hover:bg-gray text-gray-900 rounded-lg font-medium transition-colors"
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
