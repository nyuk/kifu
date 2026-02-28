package repositories

import domainrepos "github.com/moneyvessel/kifu/internal/domain/repositories"

var _ domainrepos.DomainContextRepository = (*DomainContextRepositoryImpl)(nil)
