package layered_recursion is
  type CoverageIDType is record
    ID : integer;
  end record CoverageIDType;
  type CovPType is protected
  end protected;

end package;
package body layered_recursion is
  type CovPType is protected body
    type RangeType is record
    min : integer;
    max : integer;
  end record;
  type RangeArrayType is array (integer range <>) of RangeType;

  type RangeArrayPtrType is access RangeArrayType;

  type CovBinInternalBaseType is record
    BinVal : RangeArrayPtrType;

  end record CovBinInternalBaseType;
  type CovBinInternalType is array (natural range <>) of CovBinInternalBaseType;
  type CovBinPtrType is access CovBinInternalType;

  type CovStructType is record
    CovBinPtr : CovBinPtrType;
  end record CovStructType;
  type ItemArrayType is array (integer range <>) of CovStructType;

  type ItemArrayPtrType is access ItemArrayType;
  variable Template : ItemArrayType(1 to 1) := (1 => (CovBinPtr => null));

  variable CovStructPtr : ItemArrayPtrType := new ItemArrayType'(Template);


  procedure DeallocateBins(CoverID : CoverageIDType) is
    ------------------------------------------------------------
    constant Index : integer := CoverID.ID;
  begin
    -- Local for a particular CoverageModel
    deallocate(CovStructPtr(Index).CovBinPtr(0).BinVal);
  end procedure;

end protected body;
end package body;
