import React from 'react';
import { ChevronRight } from 'lucide-react';
import '../dashboard-panels.css';

export type DashboardCardVariant = 'hero' | 'list' | 'shelf' | 'base';

export interface DashboardCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: DashboardCardVariant;
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'section';
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  variant = 'base',
  children,
  className = '',
  as = 'div',
  ...rest
}) => {
  const Component = as;
  const variantClass = `dashboard-card--${variant}`;

  return (
    <Component
      className={`dashboard-card ${variantClass} ${className}`.trim()}
      {...rest}
    >
      {/* Rasgo propio de variante hero: Cinta carmesí colgando */}
      {variant === 'hero' && (
        <div className="dashboard-ribbon" aria-hidden="true" />
      )}
      {children}
    </Component>
  );
};

export interface DashboardCardHeaderProps {
  icon?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  actionHref?: string;
  actionAriaLabel?: string;
  variant?: DashboardCardVariant;
  customHeader?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export const DashboardCardHeader: React.FC<DashboardCardHeaderProps> = ({
  icon,
  title,
  subtitle,
  actionText,
  onAction,
  actionHref,
  actionAriaLabel,
  variant = 'base',
  customHeader,
  className = '',
  children
}) => {
  const isHero = variant === 'hero';

  return (
    <div
      className={`dashboard-card-header ${
        isHero ? 'dashboard-card-header--hero' : ''
      } ${className}`.trim()}
    >
      {customHeader ? (
        customHeader
      ) : (
        <div className="dashboard-card-title-group">
          {icon && (
            <span className="dashboard-card-icon" aria-hidden="true">
              {icon}
            </span>
          )}
          <div>
            {title && (
              <h2
                className={`dashboard-card-title ${
                  isHero ? 'dashboard-card-title--hero' : ''
                }`}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <div className="dashboard-card-subtitle mt-0.5">{subtitle}</div>
            )}
          </div>
        </div>
      )}

      {children}

      {actionText && (
        onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="dashboard-card-action"
            aria-label={actionAriaLabel}
          >
            <span>{actionText}</span>
            <ChevronRight className="dashboard-card-action-chevron" aria-hidden="true" />
          </button>
        ) : actionHref ? (
          <a
            href={actionHref}
            className="dashboard-card-action"
            aria-label={actionAriaLabel}
          >
            <span>{actionText}</span>
            <ChevronRight className="dashboard-card-action-chevron" aria-hidden="true" />
          </a>
        ) : null
      )}
    </div>
  );
};
