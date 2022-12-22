use std.textio.all ;
package test_selected_name is
end package;
package body test_selected_name is
  type MessageStructType ;
  type MessageStructPtrType is access MessageStructType ;
  type MessageStructType is record
    Name    : line ;
    NextPtr : MessageStructPtrType ;
  end record MessageStructType ;
  type CovStructType is record
    CovMessage         : MessageStructPtrType ;
  end record CovStructType ;

  impure function GetNamePlus(ID : integer) return String is
    ------------------------------------------------------------
    type     ItemArrayPtrType is access ItemArrayType ;
    type     ItemArrayType    is array (integer range <>) of CovStructType ;

    variable CovStructPtr          : ItemArrayPtrType := new ItemArrayType'(5) ; -- vhdl-linter-disable-line unused

    begin
        return CovStructPtr(ID).CovMessage.Name.all;
    end function GetNamePlus ;

  impure function GetNamePlus return String is
    ------------------------------------------------------------


    variable Cov          : CovStructType; -- vhdl-linter-disable-line unused

    begin
        return Cov.CovMessage.Name.all;
    end function GetNamePlus ;
end package body;