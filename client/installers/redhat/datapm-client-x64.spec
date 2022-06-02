# Don't strip executable files (seems unnecessary, but is)
# https://www.covermymeds.com/main/insights/articles/rpm-build-issues-with-binaries/
%global __os_install_post %{nil}

Name:           datapm-client
Version:        x.x.x
Release:        BUILD_NUMBER%{?dist}
Summary:        A package manager for data
BuildArch:      x86_64
URL:            https://datapm.io
License:        https://datapm.io/docs/license
Source0:        %{name}-%{version}-source.tar.gz

# Requires:       nothing-required

# Don't automatically include dependencies by scanning
# files. This was including libc, and making it incompatible
# with older versions of linux. This might not be the right
# thing to do
AutoReqProv:    no

%description
DataPM is a package manager for data. See more at https://datapm.io

%prep
rm -rf ${RPM_BUILD_ROOT}
mkdir -p ${RPM_BUILD_ROOT}/opt/datapm
cp -aR ../../../../pkg-linux-intel64/* ${RPM_BUILD_ROOT}/opt/datapm

%install
echo "Install"

%clean
echo "Clean"

%post
ln -s /opt/datapm/datapm /usr/bin/datapm

%postun
rm -f /usr/bin/datapm

%files
%defattr(-,root,root,-)
/opt/datapm

%changelog
* Mon Feb 07 2021 Travis Collins <hello@datapm.io> - 0.0.1
- See https://github.com/big-armor/datapm/blob/master/CHANGELOG.md 